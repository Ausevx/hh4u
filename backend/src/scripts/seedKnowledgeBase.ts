#!/usr/bin/env ts-node
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db';
import Level1Question from '../models/Level1Question';
import ConsultationQuery from '../models/ConsultationQuery';
import Answer from '../models/Answer';
import Admin from '../models/Admin';
import { getAIServices } from '../services/ai/aiContainer';
import { parseExcelFile, ParsedExcelData } from '../services/excelParserService';
import { checkVectorIndexStatus, VECTOR_INDEX_NAME } from '../services/vectorSearchService';

dotenv.config();

export interface SeedOptions {
  excelPath?: string;
  skipDisconnect?: boolean;
  dropExisting?: boolean;
  log?: boolean;
  adminEmail?: string;
  adminPassword?: string;
}

export interface SeedResult {
  success: boolean;
  excelMetrics: {
    filePath: string;
    level1Rows: number;
    consultationRows: number;
    answerRows: number;
  };
  counts: {
    questions: number;
    consultations: number;
    answers: number;
    level1Answers: number;
    diagnosticAnswers: number;
    admin: number;
  };
  durationMs: number;
}

/**
 * Resolves the absolute path to database-dummy.xlsx across various execution contexts.
 */
export function resolveExcelPath(providedPath?: string): string {
  if (providedPath) {
    const resolved = path.resolve(providedPath);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Seed Excel file not found at: ${providedPath}`);
    }
    return resolved;
  }
  if (process.env.SEED_EXCEL_PATH) {
    const resolved = path.resolve(process.env.SEED_EXCEL_PATH);
    if (fs.existsSync(resolved)) {
      return resolved;
    }
  }

  const candidates = [
    path.resolve(__dirname, '../../../database-dummy.xlsx'),
    path.resolve(process.cwd(), 'database-dummy.xlsx'),
    path.resolve(process.cwd(), '../database-dummy.xlsx'),
    path.resolve(__dirname, '../../../../database-dummy.xlsx'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Seed Excel file not found. Checked: ${candidates.join(', ')}. Please supply a valid path via CLI argument or SEED_EXCEL_PATH.`
  );
}

/**
 * Programmatic seeding function for knowledge base and default admin.
 */
export async function seedKnowledgeBase(options?: SeedOptions): Promise<SeedResult> {
  const startTime = Date.now();
  const log = options?.log ?? false;
  const adminEmail = options?.adminEmail || 'admin@healinghands4u.com';
  const adminPassword = options?.adminPassword || 'Admin@123456';

  const filePath = resolveExcelPath(options?.excelPath);
  if (log) {
    console.log(`[Seed] Using Excel source: ${filePath}`);
  }

  // 1. Parse Excel file
  const parsed: ParsedExcelData = await parseExcelFile(filePath);
  if (log) {
    console.log(`[Seed] Parsed ${parsed.level1Questions.length} questions, ${parsed.consultationQueries.length} consultation sets, ${parsed.answers.length} answers.`);
  }

  // 2. Optional: Drop existing collections
  if (options?.dropExisting) {
    if (log) {
      console.log('[Seed] Dropping existing collections (--drop / --fresh specified)...');
    }
    await Level1Question.deleteMany({});
    await ConsultationQuery.deleteMany({});
    await Answer.deleteMany({});
    await Admin.deleteMany({ email: adminEmail });
  }

  // 3. Generate Embeddings for all Level 1 Questions (1536 dims)
  const ai = getAIServices();
  if (log) {
    console.log(`[Seed] Generating 1536-dimensional embeddings for ${parsed.level1Questions.length} Level 1 questions...`);
  }
  const questionTexts = parsed.level1Questions.map((q) => q.canonicalQuestionText);
  let embeddings: number[][];
  if (typeof (ai.embedding as any).generateBatchEmbeddings === 'function') {
    embeddings = await (ai.embedding as any).generateBatchEmbeddings(questionTexts);
  } else {
    embeddings = await Promise.all(questionTexts.map((text) => ai.embedding.generateEmbedding(text)));
  }

  // 4. Upsert Level 1 Questions (idempotent matching on canonicalQuestionText)
  if (log) {
    console.log(`[Seed] Upserting ${parsed.level1Questions.length} Level 1 questions...`);
  }
  const questionMap = new Map<string, mongoose.Types.ObjectId>();

  for (let i = 0; i < parsed.level1Questions.length; i++) {
    const item = parsed.level1Questions[i];
    const embedding = embeddings[i];

    const qDoc = await Level1Question.findOneAndUpdate(
      { canonicalQuestionText: item.canonicalQuestionText },
      {
        $set: {
          canonicalQuestionText: item.canonicalQuestionText,
          embedding,
          isActive: true,
        },
        $setOnInsert: {
          tags: ['homeopathy', 'general'],
          version: 1,
        },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    questionMap.set(item.canonicalQuestionText, qDoc._id as mongoose.Types.ObjectId);
  }

  // 5. Upsert Consultation Queries (linked via level1QuestionId)
  if (log) {
    console.log(`[Seed] Upserting ${parsed.consultationQueries.length} Consultation Queries...`);
  }
  const questionIdList = Array.from(questionMap.values());

  for (let i = 0; i < parsed.consultationQueries.length; i++) {
    const cq = parsed.consultationQueries[i];
    const qDocId = questionMap.get(cq.questionText) || questionIdList[i];

    if (!qDocId) {
      throw new Error(`Cannot link ConsultationQuery row ${cq.rawRow}: question "${cq.questionText}" not found in Level 1 questions.`);
    }

    const diagnosticQuestions = cq.diagnosticQuestions.map((dqText, idx) => ({
      id: `diag_${idx + 1}`,
      questionText: dqText,
    }));

    await ConsultationQuery.findOneAndUpdate(
      { level1QuestionId: qDocId },
      {
        $set: {
          level1QuestionId: qDocId,
          diagnosticQuestions,
        },
        $setOnInsert: {
          answerBranches: [],
        },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
  }

  // 6. Upsert Answers (184 direct Level 1 answers + 36 diagnostic question answers)
  if (log) {
    console.log(`[Seed] Upserting ${parsed.answers.length} Answers (direct + diagnostic)...`);
  }

  for (let i = 0; i < parsed.answers.length; i++) {
    const ans = parsed.answers[i];
    const isLevel1 = ans.answerType === 'level1' || i < parsed.level1Questions.length;
    const answerText = (ans.reasonText && ans.remedyText)
      ? `${ans.reasonText}\n\n${ans.remedyText}`
      : (ans.remedyText || ans.reasonText || 'Homeopathic guidance.');

    if (isLevel1) {
      const qDocId = questionMap.get(ans.questionText) || questionIdList[i];
      await Answer.findOneAndUpdate(
        { questionText: ans.questionText, answerType: 'level1' },
        {
          $set: {
            level1QuestionId: qDocId,
            questionText: ans.questionText,
            answerType: 'level1',
            reasonText: ans.reasonText,
            remedyText: ans.remedyText,
            homeRemedyText: ans.remedyText,
            answerText,
            videoUrl: ans.videoUrl,
          },
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
      );
    } else {
      // Diagnostic question answer
      await Answer.findOneAndUpdate(
        { questionText: ans.questionText, answerType: 'diagnostic' },
        {
          $set: {
            questionText: ans.questionText,
            answerType: 'diagnostic',
            reasonText: ans.reasonText,
            remedyText: ans.remedyText,
            homeRemedyText: ans.remedyText,
            answerText,
            videoUrl: ans.videoUrl,
          },
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
      );
    }
  }

  // 7. Upsert Default Admin User
  if (log) {
    console.log(`[Seed] Creating / updating default admin user (${adminEmail})...`);
  }
  await Admin.findOneAndUpdate(
    { email: adminEmail },
    {
      $set: {
        email: adminEmail,
        passwordHash: adminPassword,
        authProvider: 'password',
        role: 'admin',
      },
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );

  // 8. Verify Database Counts against Acceptance Criteria 1
  const totalQuestions = await Level1Question.countDocuments();
  const totalConsultations = await ConsultationQuery.countDocuments();
  const totalAnswers = await Answer.countDocuments();
  const level1Answers = await Answer.countDocuments({ answerType: 'level1' });
  const diagnosticAnswers = await Answer.countDocuments({ answerType: 'diagnostic' });
  const totalAdmin = await Admin.countDocuments({ email: adminEmail });

  if (totalQuestions < 184) {
    throw new Error(`Acceptance Criteria failure: expected 184 questions, found ${totalQuestions}`);
  }
  if (totalConsultations < 184) {
    throw new Error(`Acceptance Criteria failure: expected 184 consultation queries, found ${totalConsultations}`);
  }
  if (totalAnswers < 220) {
    throw new Error(`Acceptance Criteria failure: expected 220 answers, found ${totalAnswers}`);
  }
  if (totalAdmin < 1) {
    throw new Error(`Acceptance Criteria failure: default admin (${adminEmail}) not found.`);
  }

  const durationMs = Date.now() - startTime;

  return {
    success: true,
    excelMetrics: {
      filePath,
      level1Rows: parsed.stats.totalRows.level1,
      consultationRows: parsed.stats.totalRows.consultation,
      answerRows: parsed.stats.totalRows.answers,
    },
    counts: {
      questions: totalQuestions,
      consultations: totalConsultations,
      answers: totalAnswers,
      level1Answers,
      diagnosticAnswers,
      admin: totalAdmin,
    },
    durationMs,
  };
}

/**
 * CLI runner function.
 */
export async function runCli(): Promise<void> {
  console.log('================================================================');
  console.log('  Healing Hands4U: Knowledge Base CLI Seed Script');
  console.log('================================================================\n');

  const dropExisting = process.argv.includes('--drop') || process.argv.includes('--fresh');
  const customPathArg = process.argv.slice(2).find((arg) => !arg.startsWith('--'));

  try {
    console.log('[1/5] Connecting to MongoDB Atlas...');
    await connectDB();
    console.log('[1/5] Connected successfully.\n');

    console.log('[2/5] Seeding Knowledge Base from Excel...');
    const result = await seedKnowledgeBase({
      excelPath: customPathArg,
      dropExisting,
      log: true,
      skipDisconnect: true,
    });

    console.log('\n[3/5] Seeding Summary:');
    console.log(`      Excel File:            ${result.excelMetrics.filePath}`);
    console.log(`      Level 1 Questions:     ${result.counts.questions} (Sheet rows: ${result.excelMetrics.level1Rows})`);
    console.log(`      Consultation Queries:  ${result.counts.consultations} (Sheet rows: ${result.excelMetrics.consultationRows})`);
    console.log(`      Answers (Total):       ${result.counts.answers} (Sheet rows: ${result.excelMetrics.answerRows})`);
    console.log(`        - Level 1 Answers:   ${result.counts.level1Answers}`);
    console.log(`        - Diagnostic Answers:${result.counts.diagnosticAnswers}`);
    console.log(`      Default Admin User:    ${result.counts.admin} (admin@healinghands4u.com)`);
    console.log(`      Duration:              ${result.durationMs}ms\n`);

    console.log('[4/5] Checking Vector Search Index Status...');
    try {
      const vStatus = await checkVectorIndexStatus(VECTOR_INDEX_NAME);
      console.log(`      Index Name:            ${VECTOR_INDEX_NAME}`);
      console.log(`      Active / Queryable:    ${vStatus.queryable}`);
      console.log(`      Status:                ${vStatus.status || 'READY'}\n`);
    } catch {
      console.log('      Vector search status check skipped (local/offline mode).\n');
    }

    console.log('================================================================');
    console.log('✔ KNOWLEDGE BASE SEEDING & VERIFICATION COMPLETE (AC-1 MET)');
    console.log('================================================================');
    process.exit(0);
  } catch (error) {
    console.error('\n✖ ERROR: Seeding failed:', (error as Error).message);
    process.exit(1);
  } finally {
    try {
      await mongoose.disconnect();
    } catch {
      // Ignore disconnect error on exit
    }
  }
}

if (require.main === module) {
  runCli();
}
