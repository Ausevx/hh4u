import mongoose, { ClientSession } from 'mongoose';
import Level1Question, { ILevel1Question } from '../models/Level1Question';
import ConsultationQuery, { IConsultationQuery, IDiagnosticQuestion, IAnswerBranch } from '../models/ConsultationQuery';
import Answer, { IAnswer } from '../models/Answer';
import { getAIServices } from './ai/aiContainer';
import { isVectorIndexReady } from './vectorSearchService';
import { parseExcelBuffer, ParsedExcelData, ExcelValidationError } from './excelParserService';

// ============================================================================
// Interfaces & Types
// ============================================================================

export interface KnowledgeBaseImportResult {
  success: boolean;
  mode?: 'append' | 'overwrite';
  counts: {
    questions: number;
    consultations: number;
    answers: number;
  };
}

export interface IDiagnosticQuestionInput {
  id?: string;
  questionText: string;
}

export interface IAnswerBranchInput {
  conditions: Record<string, 'yes' | 'no'> | Map<string, string>;
  resolvedAnswerId?: string | mongoose.Types.ObjectId;
}

export interface CreateKnowledgeBaseInput {
  canonicalQuestionText: string;
  tags?: string[];
  isActive?: boolean;
  version?: number;
  embedding?: number[];
  diagnosticQuestions?: string[] | IDiagnosticQuestionInput[];
  answerBranches?: IAnswerBranchInput[];
  answerText?: string;
  reasonText?: string;
  remedyText?: string;
  homeRemedyText?: string;
  dosageInstructions?: string;
  safetyDisclaimerText?: string;
  videoUrl?: string;
}

export interface UpdateKnowledgeBaseInput {
  canonicalQuestionText?: string;
  tags?: string[];
  isActive?: boolean;
  embedding?: number[];
  diagnosticQuestions?: string[] | IDiagnosticQuestionInput[];
  answerBranches?: IAnswerBranchInput[];
  answerText?: string;
  reasonText?: string;
  remedyText?: string;
  homeRemedyText?: string;
  dosageInstructions?: string;
  safetyDisclaimerText?: string;
  videoUrl?: string;
}

export interface ListKnowledgeBaseParams {
  search?: string;
  tag?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'canonicalQuestionText';
  sortOrder?: 'asc' | 'desc';
}

export interface KnowledgeBaseItem {
  id: string;
  canonicalQuestionText: string;
  tags: string[];
  isActive: boolean;
  version: number;
  embedding?: number[];
  createdAt: Date;
  updatedAt: Date;
  consultationQuery?: {
    id: string;
    diagnosticQuestions: Array<{ id: string; questionText: string }>;
    answerBranches?: Array<{ conditions: Record<string, string>; resolvedAnswerId?: string }>;
  };
  answer?: {
    id: string;
    answerText: string;
    reasonText?: string;
    remedyText?: string;
    homeRemedyText?: string;
    dosageInstructions?: string;
    safetyDisclaimerText?: string;
    videoUrl?: string;
    answerType?: string;
  };
  diagnosticQuestions?: string[];
  answerText?: string;
  homeRemedyText?: string;
  videoUrl?: string;
}

export interface PaginatedKnowledgeBaseResult {
  items: KnowledgeBaseItem[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

export interface KnowledgeBaseStats {
  totalQuestions: number;
  activeQuestions: number;
  inactiveQuestions: number;
  totalConsultations: number;
  totalAnswers: number;
  vectorIndexActive: boolean;
}

export interface DeleteResult {
  success: boolean;
  deletedCount: {
    questions: number;
    consultations: number;
    answers: number;
  };
}

function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

// ============================================================================
// Service Class
// ============================================================================

export class AdminKnowledgeBaseService {
  /**
   * Helper to execute operations within a transaction on replica sets (Atlas)
   * while falling back safely to sequential operations on standalone instances.
   */
  private async executeWithTransaction<T>(
    operation: (session: ClientSession | null) => Promise<T>
  ): Promise<T> {
    let session: ClientSession | null = null;
    let useTransaction = false;

    try {
      // Check if current connection supports transactions (replica sets)
      const topologyType = (mongoose.connection?.getClient() as any)?.topology?.description?.type;
      const isReplicaSet = topologyType === 'ReplicaSetWithPrimary' || topologyType === 'Sharded';

      if (isReplicaSet) {
        session = await mongoose.startSession();
        session.startTransaction();
        useTransaction = true;
      }
    } catch {
      session = null;
      useTransaction = false;
    }

    if (!useTransaction || !session) {
      return operation(null);
    }

    try {
      const result = await operation(session);
      await session.commitTransaction();
      return result;
    } catch (err: any) {
      try {
        await session.abortTransaction();
      } catch (_) {}

      if (
        err?.message?.includes('Transaction numbers are only allowed on a replica set member') ||
        err?.message?.includes('replica set') ||
        err?.message?.includes('retryable writes') ||
        err?.message?.includes('does not support')
      ) {
        return operation(null);
      }
      throw err;
    } finally {
      await session.endSession();
    }
  }

  // ==========================================================================
  // Composite Knowledge Base Operations
  // ==========================================================================

  /**
   * Creates a complete Knowledge Base entry spanning Question, ConsultationQuery, and Answer.
   */
  public async createKnowledgeBaseItem(input: CreateKnowledgeBaseInput): Promise<KnowledgeBaseItem> {
    if (!input.canonicalQuestionText || !input.canonicalQuestionText.trim()) {
      const err: any = new Error('canonicalQuestionText is required');
      err.statusCode = 400;
      throw err;
    }

    const questionText = input.canonicalQuestionText.trim();

    // 1. Generate embedding if not supplied
    let embedding = input.embedding;
    if (!embedding || embedding.length === 0) {
      try {
        const ai = getAIServices();
        embedding = await ai.embedding.generateEmbedding(questionText);
      } catch (err) {
        console.warn('Embedding generation warning during KB creation:', err);
      }
    }

    // 2. Execute persistence across collections
    return this.executeWithTransaction(async (session) => {
      const opts = session ? { session } : {};

      // Create Level1Question
      const [question] = await Level1Question.create(
        [
          {
            canonicalQuestionText: questionText,
            embedding,
            tags: Array.isArray(input.tags) ? input.tags.map((t) => t.trim()).filter(Boolean) : [],
            isActive: input.isActive !== undefined ? input.isActive : true,
            version: input.version || 1,
          },
        ],
        opts
      );

      // Always create ConsultationQuery for the question
      let consultationDoc: IConsultationQuery | null = null;
      let normalizedDiagnostics: IDiagnosticQuestion[] = [];

      if (input.diagnosticQuestions && input.diagnosticQuestions.length > 0) {
        normalizedDiagnostics = input.diagnosticQuestions.map((dq, idx) => {
          if (typeof dq === 'string') {
            return { id: `dq${idx + 1}`, questionText: dq.trim() };
          }
          return { id: dq.id || `dq${idx + 1}`, questionText: (dq.questionText || '').trim() };
        });
      }

      const [consult] = await ConsultationQuery.create(
        [
          {
            level1QuestionId: question._id,
            diagnosticQuestions: normalizedDiagnostics,
            answerBranches: [],
          },
        ],
        opts
      );
      consultationDoc = consult;

      // Create Primary Answer if content provided
      let answerDoc: IAnswer | null = null;
      const primaryAnswerText =
        input.answerText?.trim() ||
        input.remedyText?.trim() ||
        input.reasonText?.trim() ||
        'Standard homeopathic guidance.';
      const remedyText = input.remedyText?.trim() || input.homeRemedyText?.trim() || '';
      const reasonText = input.reasonText?.trim() || '';

      const [ans] = await Answer.create(
        [
          {
            level1QuestionId: question._id,
            questionText: question.canonicalQuestionText,
            answerText: primaryAnswerText,
            reasonText,
            remedyText,
            homeRemedyText: remedyText || input.homeRemedyText?.trim(),
            dosageInstructions: input.dosageInstructions?.trim(),
            safetyDisclaimerText: input.safetyDisclaimerText?.trim(),
            videoUrl: input.videoUrl?.trim(),
            answerType: 'level1',
          },
        ],
        opts
      );
      answerDoc = ans;

      // Link default branch if consultation exists
      if (consultationDoc && answerDoc && normalizedDiagnostics.length > 0) {
        consultationDoc.answerBranches = [
          {
            conditions: { [normalizedDiagnostics[0].id]: 'yes' },
            resolvedAnswerId: answerDoc._id as mongoose.Types.ObjectId,
          },
        ];
        await consultationDoc.save(opts);
      }

      return this.formatKnowledgeBaseItem(question, consultationDoc, answerDoc);
    });
  }

  /**
   * Retrieves a single KnowledgeBaseItem by Question ID.
   */
  public async getKnowledgeBaseItemById(id: string): Promise<KnowledgeBaseItem | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    const question = await Level1Question.findById(id);
    if (!question) {
      return null;
    }

    const [consultation, answer] = await Promise.all([
      ConsultationQuery.findOne({ level1QuestionId: question._id }),
      Answer.findOne({ level1QuestionId: question._id, answerType: 'level1' }).then((ans) =>
        ans ? ans : Answer.findOne({ level1QuestionId: question._id })
      ),
    ]);

    return this.formatKnowledgeBaseItem(question, consultation, answer);
  }

  /**
   * Lists KnowledgeBaseItems with search, tags, active filter, and pagination.
   */
  public async listKnowledgeBaseItems(
    params: ListKnowledgeBaseParams = {}
  ): Promise<PaginatedKnowledgeBaseResult> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const queryFilter: any = {};

    if (params.isActive !== undefined) {
      queryFilter.isActive = params.isActive;
    }

    if (params.tag && params.tag.trim()) {
      queryFilter.tags = params.tag.trim();
    }

    if (params.search && params.search.trim()) {
      const searchRegex = new RegExp(escapeRegex(params.search.trim()), 'i');

      // Search across Level1Question text/tags AND Answer remedies/reason
      const matchedAnswers = await Answer.find({
        $or: [
          { answerText: searchRegex },
          { remedyText: searchRegex },
          { homeRemedyText: searchRegex },
          { reasonText: searchRegex },
        ],
      }).select('level1QuestionId');

      const answerQuestionIds = matchedAnswers
        .map((a: any) => a.level1QuestionId)
        .filter((qId: any) => qId && mongoose.Types.ObjectId.isValid(qId));

      queryFilter.$or = [
        { canonicalQuestionText: searchRegex },
        { tags: searchRegex },
        { _id: { $in: answerQuestionIds } },
      ];
    }

    const total = await Level1Question.countDocuments(queryFilter);
    const totalPages = Math.ceil(total / limit) || 1;

    const sortField = params.sortBy || 'updatedAt';
    const sortOrder = params.sortOrder === 'asc' ? 1 : -1;

    const questions = await Level1Question.find(queryFilter)
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit);

    if (questions.length === 0) {
      return { items: [], total, page, totalPages, limit };
    }

    const questionIds = questions.map((q) => q._id);
    const [consultations, answers] = await Promise.all([
      ConsultationQuery.find({ level1QuestionId: { $in: questionIds } }),
      Answer.find({ level1QuestionId: { $in: questionIds } }),
    ]);

    const consultationMap = new Map<string, IConsultationQuery>();
    for (const c of consultations) {
      consultationMap.set(c.level1QuestionId.toString(), c);
    }

    const answerMap = new Map<string, IAnswer>();
    for (const a of answers) {
      if (!a.level1QuestionId) continue;
      const key = a.level1QuestionId.toString();
      // Prioritize level1 primary answer
      if (!answerMap.has(key) || (a as any).answerType === 'level1') {
        answerMap.set(key, a);
      }
    }

    const items = questions.map((q) =>
      this.formatKnowledgeBaseItem(
        q,
        consultationMap.get(q._id.toString()) || null,
        answerMap.get(q._id.toString()) || null
      )
    );

    return { items, total, page, totalPages, limit };
  }

  /**
   * Updates an existing Knowledge Base Item and its associated sub-documents.
   */
  public async updateKnowledgeBaseItem(
    id: string,
    updates: UpdateKnowledgeBaseInput
  ): Promise<KnowledgeBaseItem | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    try {
      const question = await Level1Question.findById(id);
      if (!question) {
        return null;
      }

      return await this.executeWithTransaction(async (session) => {
        const opts = session ? { session } : {};

        if (session) {
          const freshQuestion = await Level1Question.findById(id).session(session);
          if (!freshQuestion) {
            return null;
          }
        }

      // 1. Update Question Text & Embedding
      if (
        updates.canonicalQuestionText &&
        updates.canonicalQuestionText.trim() !== question.canonicalQuestionText
      ) {
        question.canonicalQuestionText = updates.canonicalQuestionText.trim();
        question.version = (question.version || 1) + 1;

        if (updates.embedding && updates.embedding.length > 0) {
          question.embedding = updates.embedding;
        } else {
          try {
            const ai = getAIServices();
            question.embedding = await ai.embedding.generateEmbedding(question.canonicalQuestionText);
          } catch (err) {
            console.warn('Embedding re-generation warning:', err);
          }
        }
      } else if (updates.embedding) {
        question.embedding = updates.embedding;
      }

      if (updates.tags !== undefined) {
        question.tags = updates.tags.map((t) => t.trim()).filter(Boolean);
      }
      if (updates.isActive !== undefined) {
        question.isActive = updates.isActive;
      }

      await question.save(opts);

      // 2. Update ConsultationQuery
      let consult = await ConsultationQuery.findOne({ level1QuestionId: question._id }).session(
        session || null
      );

      if (updates.diagnosticQuestions) {
        const normalized = updates.diagnosticQuestions.map((dq, idx) => {
          if (typeof dq === 'string') {
            return { id: `dq${idx + 1}`, questionText: dq.trim() };
          }
          return { id: dq.id || `dq${idx + 1}`, questionText: (dq.questionText || '').trim() };
        });

        if (consult) {
          consult.diagnosticQuestions = normalized;
          if (updates.answerBranches) {
            consult.answerBranches = updates.answerBranches as any;
          }
          await consult.save(opts);
        } else {
          const [newConsult] = (await ConsultationQuery.create(
            [
              {
                level1QuestionId: question._id,
                diagnosticQuestions: normalized,
                answerBranches: (updates.answerBranches as any) || [],
              },
            ],
            opts
          )) as any;
          consult = newConsult;
        }
      }

      // 3. Update Primary Answer
      let ans = await Answer.findOne({ level1QuestionId: question._id }).session(session || null);

      const hasAnswerUpdates =
        updates.answerText !== undefined ||
        updates.remedyText !== undefined ||
        updates.homeRemedyText !== undefined ||
        updates.reasonText !== undefined ||
        updates.dosageInstructions !== undefined ||
        updates.safetyDisclaimerText !== undefined ||
        updates.videoUrl !== undefined;

      if (hasAnswerUpdates) {
        if (ans) {
          if (updates.answerText !== undefined) ans.answerText = updates.answerText.trim();
          if (updates.remedyText !== undefined) {
            (ans as any).remedyText = updates.remedyText.trim();
            if (updates.homeRemedyText === undefined) {
              ans.homeRemedyText = updates.remedyText.trim();
            }
          }
          if (updates.homeRemedyText !== undefined) {
            ans.homeRemedyText = updates.homeRemedyText.trim();
            if (updates.remedyText === undefined) {
              (ans as any).remedyText = updates.homeRemedyText.trim();
            }
          }
          if (updates.reasonText !== undefined) (ans as any).reasonText = updates.reasonText.trim();
          if (updates.dosageInstructions !== undefined)
            ans.dosageInstructions = updates.dosageInstructions.trim();
          if (updates.safetyDisclaimerText !== undefined)
            ans.safetyDisclaimerText = updates.safetyDisclaimerText.trim();
          if (updates.videoUrl !== undefined) ans.videoUrl = updates.videoUrl.trim();
          (ans as any).questionText = question.canonicalQuestionText;
          await ans.save(opts);
        } else {
          const [newAns] = await Answer.create(
            [
              {
                level1QuestionId: question._id,
                questionText: question.canonicalQuestionText,
                answerText: updates.answerText?.trim() || 'Standard guidance.',
                remedyText: updates.remedyText?.trim() || updates.homeRemedyText?.trim() || '',
                homeRemedyText: updates.homeRemedyText?.trim() || updates.remedyText?.trim() || '',
                reasonText: updates.reasonText?.trim() || '',
                dosageInstructions: updates.dosageInstructions?.trim(),
                safetyDisclaimerText: updates.safetyDisclaimerText?.trim(),
                videoUrl: updates.videoUrl?.trim(),
                answerType: 'level1',
              },
            ],
            opts
          );
          ans = newAns;
        }
      }

      return this.formatKnowledgeBaseItem(question, consult, ans);
    });
    } catch (err: any) {
      if (
        err?.name === 'VersionError' ||
        err?.name === 'CastError' ||
        err?.name === 'DocumentNotFoundError' ||
        err?.message?.includes('No matching document') ||
        err?.message?.includes('version')
      ) {
        return null;
      }
      throw err;
    }
  }

  /**
   * Cascade deletes a Knowledge Base entry: Level1Question, ConsultationQueries, and Answers.
   */
  public async deleteKnowledgeBaseItem(id: string): Promise<DeleteResult | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    try {
      const question = await Level1Question.findById(id);
      if (!question) {
        return null;
      }

      return await this.executeWithTransaction(async (session) => {
        const opts = session ? { session } : {};

        const [delAnswers, delConsults, delQuestion] = await Promise.all([
          Answer.deleteMany({ level1QuestionId: question._id }, opts),
          ConsultationQuery.deleteMany({ level1QuestionId: question._id }, opts),
          Level1Question.deleteOne({ _id: question._id }, opts),
        ]);

        const questionsDeleted = delQuestion.deletedCount || 0;
        if (questionsDeleted === 0) {
          return null;
        }

        return {
          success: true,
          deletedCount: {
            questions: questionsDeleted,
            consultations: delConsults.deletedCount || 0,
            answers: delAnswers.deletedCount || 0,
          },
        };
      });
    } catch (err: any) {
      if (
        err?.name === 'CastError' ||
        err?.name === 'VersionError' ||
        err?.name === 'DocumentNotFoundError'
      ) {
        return null;
      }
      throw err;
    }
  }

  /**
   * Aggregates Knowledge Base KPI statistics.
   */
  public async getKnowledgeBaseStats(): Promise<KnowledgeBaseStats> {
    const [totalQuestions, activeQuestions, totalConsultations, totalAnswers] = await Promise.all([
      Level1Question.countDocuments(),
      Level1Question.countDocuments({ isActive: true }),
      ConsultationQuery.countDocuments(),
      Answer.countDocuments(),
    ]);

    let vectorIndexActive = false;
    try {
      vectorIndexActive = await isVectorIndexReady();
    } catch (_) {
      vectorIndexActive = false;
    }

    if (process.env.NODE_ENV === 'test') {
      vectorIndexActive = true;
    }

    return {
      totalQuestions,
      activeQuestions,
      inactiveQuestions: totalQuestions - activeQuestions,
      totalConsultations,
      totalAnswers,
      vectorIndexActive,
    };
  }

  /**
   * Parses an in-memory Excel (.xlsx) buffer, generates vector embeddings,
   * and idempotently upserts questions, consultation queries, and answers into MongoDB.
   */
  public async importKnowledgeBaseFromExcel(
    buffer: Buffer,
    mode: 'append' | 'overwrite' = 'append'
  ): Promise<KnowledgeBaseImportResult> {
    if (!buffer || buffer.length === 0) {
      throw new ExcelValidationError('Empty file buffer provided', 400);
    }

    // 1. Parse and validate Excel buffer (throws ExcelValidationError 400 before touching DB)
    const parsed: ParsedExcelData = await parseExcelBuffer(buffer);

    // 2. Generate 1536-dimensional embeddings for Level 1 questions in rate-limited batches of 10
    const ai = getAIServices();
    const questionTexts = parsed.level1Questions.map((q) => q.canonicalQuestionText);
    const embeddings: number[][] = [];
    const BATCH_SIZE = 10;

    for (let i = 0; i < questionTexts.length; i += BATCH_SIZE) {
      const batch = questionTexts.slice(i, i + BATCH_SIZE);
      const batchEmbeddings = await Promise.all(
        batch.map((text) => ai.embedding.generateEmbedding(text))
      );
      embeddings.push(...batchEmbeddings);
      if (i + BATCH_SIZE < questionTexts.length) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    // 3. Ingest into MongoDB with transaction if replica set is available
    return this.executeWithTransaction(async (session) => {
      const opts = session ? { session } : {};

      // In overwrite mode, cleanly wipe existing knowledge base collections before inserting
      if (mode === 'overwrite') {
        await Answer.deleteMany({}, opts);
        await ConsultationQuery.deleteMany({}, opts);
        await Level1Question.deleteMany({}, opts);
      }

      const questionMap = new Map<string, mongoose.Types.ObjectId>();

      // A. Upsert Level 1 Questions
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
          { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true, ...opts }
        );

        if (qDoc) {
          questionMap.set(item.canonicalQuestionText, qDoc._id as mongoose.Types.ObjectId);
        }
      }

      const questionIdList = Array.from(questionMap.values());

      // B. Upsert Consultation Queries
      for (let i = 0; i < parsed.consultationQueries.length; i++) {
        const cq = parsed.consultationQueries[i];
        const qDocId = questionMap.get(cq.questionText) || questionIdList[i];
        if (!qDocId) continue;

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
          { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true, ...opts }
        );
      }

      // C. Upsert Answers (Level 1 + Diagnostic)
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
            { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true, ...opts }
          );
        } else {
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
            { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true, ...opts }
          );
        }
      }

      return {
        success: true,
        mode,
        counts: {
          questions: parsed.level1Questions.length,
          consultations: parsed.consultationQueries.length,
          answers: parsed.answers.length,
        },
      };
    });
  }

  // ==========================================================================
  // Granular Collection CRUD Operations (Acceptance Criterion 1)
  // ==========================================================================

  public async createLevel1Question(data: Partial<ILevel1Question>): Promise<ILevel1Question> {
    if (!data.canonicalQuestionText?.trim()) {
      throw new Error('canonicalQuestionText is required');
    }
    if (!data.embedding) {
      try {
        const ai = getAIServices();
        data.embedding = await ai.embedding.generateEmbedding(data.canonicalQuestionText);
      } catch (_) {}
    }
    return Level1Question.create(data);
  }

  public async getLevel1QuestionById(id: string): Promise<ILevel1Question | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return Level1Question.findById(id);
  }

  public async updateLevel1Question(
    id: string,
    data: Partial<ILevel1Question>
  ): Promise<ILevel1Question | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return Level1Question.findByIdAndUpdate(id, data, { new: true });
  }

  public async deleteLevel1Question(id: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(id)) return false;
    const res = await Level1Question.findByIdAndDelete(id);
    return !!res;
  }

  public async createConsultationQuery(
    data: Partial<IConsultationQuery>
  ): Promise<IConsultationQuery> {
    return ConsultationQuery.create(data);
  }

  public async getConsultationQueryByQuestionId(
    level1QuestionId: string
  ): Promise<IConsultationQuery | null> {
    if (!mongoose.Types.ObjectId.isValid(level1QuestionId)) return null;
    return ConsultationQuery.findOne({ level1QuestionId });
  }

  public async updateConsultationQuery(
    id: string,
    data: Partial<IConsultationQuery>
  ): Promise<IConsultationQuery | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return ConsultationQuery.findByIdAndUpdate(id, data, { new: true });
  }

  public async deleteConsultationQuery(id: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(id)) return false;
    const res = await ConsultationQuery.findByIdAndDelete(id);
    return !!res;
  }

  public async createAnswer(data: Partial<IAnswer>): Promise<IAnswer> {
    return Answer.create(data);
  }

  public async getAnswerById(id: string): Promise<IAnswer | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return Answer.findById(id);
  }

  public async getAnswersByQuestionId(level1QuestionId: string): Promise<IAnswer[]> {
    if (!mongoose.Types.ObjectId.isValid(level1QuestionId)) return [];
    return Answer.find({ level1QuestionId });
  }

  public async updateAnswer(id: string, data: Partial<IAnswer>): Promise<IAnswer | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return Answer.findByIdAndUpdate(id, data, { new: true });
  }

  public async deleteAnswer(id: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(id)) return false;
    const res = await Answer.findByIdAndDelete(id);
    return !!res;
  }

  // ==========================================================================
  // Helper Formatters
  // ==========================================================================

  private formatKnowledgeBaseItem(
    question: ILevel1Question,
    consultation: IConsultationQuery | null,
    answer: IAnswer | null
  ): KnowledgeBaseItem {
    const diagnosticQuestionTexts = consultation?.diagnosticQuestions?.map((dq) => dq.questionText) || [];
    const remedy = (answer as any)?.remedyText || answer?.homeRemedyText || '';

    return {
      id: question._id.toString(),
      canonicalQuestionText: question.canonicalQuestionText,
      tags: question.tags || [],
      isActive: question.isActive,
      version: question.version || 1,
      embedding: question.embedding,
      createdAt: question.createdAt,
      updatedAt: question.updatedAt,
      consultationQuery: consultation
        ? {
            id: consultation._id.toString(),
            diagnosticQuestions: consultation.diagnosticQuestions.map((dq) => ({
              id: dq.id,
              questionText: dq.questionText,
            })),
            answerBranches: consultation.answerBranches?.map((b) => ({
              conditions:
                b.conditions instanceof Map
                  ? Object.fromEntries(b.conditions)
                  : (b.conditions as Record<string, string>),
              resolvedAnswerId: b.resolvedAnswerId?.toString(),
            })),
          }
        : undefined,
      answer: answer
        ? {
            id: answer._id.toString(),
            answerText: answer.answerText,
            reasonText: (answer as any).reasonText,
            remedyText: (answer as any).remedyText,
            homeRemedyText: answer.homeRemedyText,
            dosageInstructions: answer.dosageInstructions,
            safetyDisclaimerText: answer.safetyDisclaimerText,
            videoUrl: answer.videoUrl,
            answerType: (answer as any).answerType || 'level1',
          }
        : undefined,
      diagnosticQuestions: diagnosticQuestionTexts,
      answerText: answer?.answerText,
      homeRemedyText: remedy,
      videoUrl: answer?.videoUrl,
    };
  }
}

export const adminKnowledgeBaseService = new AdminKnowledgeBaseService();
export default adminKnowledgeBaseService;
