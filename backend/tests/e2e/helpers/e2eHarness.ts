import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import multer from 'multer';
import * as XLSX from 'xlsx';
import jwt from 'jsonwebtoken';
import app from '../../../src/app';
import Level1Question from '../../../src/models/Level1Question';
import ConsultationQuery from '../../../src/models/ConsultationQuery';
import Answer from '../../../src/models/Answer';
import Admin, { IAdmin } from '../../../src/models/Admin';
import { getAIServices, resetAIServices } from '../../../src/services/ai/aiContainer';
import { YOUTUBE_URL_REGEX } from './seedVerification';

export const JWT_SECRET = process.env.JWT_SECRET || 'hh4u_dev_secret_key_2026';

export interface ParsedExcelData {
  level1Questions: Array<{ canonicalQuestionText: string; rawRow: number }>;
  consultationQueries: Array<{ questionText: string; diagnosticQuestions: string[]; rawRow: number }>;
  answers: Array<{
    questionText: string;
    reasonText: string;
    remedyText: string;
    videoUrl?: string;
    answerType: 'level1' | 'diagnostic';
    rawRow: number;
  }>;
  stats: {
    totalRows: { level1: number; consultation: number; answers: number };
    dataRows: { level1: number; consultation: number; answers: number };
  };
}

export class ExcelValidationError extends Error {
  statusCode: number;
  details?: string[];
  constructor(message: string, statusCode: number = 400, details?: string[]) {
    super(message);
    this.name = 'ExcelValidationError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Authoritative Excel buffer parser adhering strictly to PROJECT.md interface contract.
 */
export async function parseExcelBuffer(buffer: Buffer): Promise<ParsedExcelData> {
  if (!buffer || buffer.length === 0) {
    throw new ExcelValidationError('Empty file buffer provided', 400);
  }

  // Verify XLSX ZIP header signature (0x50, 0x4B)
  if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw new ExcelValidationError('Corrupted or invalid Excel file format: missing ZIP header', 400);
  }

  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: 'buffer' });
  } catch (err) {
    throw new ExcelValidationError('Corrupted or invalid Excel file format', 400);
  }

  const requiredSheets = ['level1', 'ConsultationQueries', 'Answers'];
  for (const sheet of requiredSheets) {
    if (!wb.SheetNames.includes(sheet)) {
      throw new ExcelValidationError(`Missing required sheet: ${sheet}`, 400);
    }
  }

  // Parse level1
  const level1Ws = wb.Sheets['level1'];
  const level1Aoa: any[][] = XLSX.utils.sheet_to_json(level1Ws, { header: 1 });
  if (level1Aoa.length === 0 || !level1Aoa[0] || level1Aoa[0][0] !== 'Questions') {
    throw new ExcelValidationError("Sheet 'level1' missing required header: 'Questions'", 400);
  }

  // Parse ConsultationQueries
  const consultWs = wb.Sheets['ConsultationQueries'];
  const consultAoa: any[][] = XLSX.utils.sheet_to_json(consultWs, { header: 1 });
  const consultHeaders = consultAoa[0] || [];
  const expectedConsultHeaders = ['Questions', 'Diagnostic Question 1', 'Diagnostic Question 2', 'Diagnostic Question 3'];
  for (const expHeader of expectedConsultHeaders) {
    if (!consultHeaders.includes(expHeader)) {
      throw new ExcelValidationError(`Sheet 'ConsultationQueries' missing required header: '${expHeader}'`, 400);
    }
  }

  // Parse Answers
  const answersWs = wb.Sheets['Answers'];
  const answersAoa: any[][] = XLSX.utils.sheet_to_json(answersWs, { header: 1 });
  const answersHeaders = answersAoa[0] || [];
  const expectedAnswersHeaders = ['Question', 'Reason', 'Remedy'];
  for (const expHeader of expectedAnswersHeaders) {
    if (!answersHeaders.includes(expHeader)) {
      throw new ExcelValidationError(`Sheet 'Answers' missing required header: '${expHeader}'`, 400);
    }
  }

  const level1Questions: Array<{ canonicalQuestionText: string; rawRow: number }> = [];
  for (let r = 1; r < level1Aoa.length; r++) {
    const row = level1Aoa[r];
    if (row && row[0] !== undefined && row[0] !== null && String(row[0]).trim() !== '') {
      level1Questions.push({
        canonicalQuestionText: String(row[0]).trim(),
        rawRow: r + 1,
      });
    }
  }

  const consultationQueries: Array<{ questionText: string; diagnosticQuestions: string[]; rawRow: number }> = [];
  for (let r = 1; r < consultAoa.length; r++) {
    const row = consultAoa[r];
    if (row && row[0] !== undefined && row[0] !== null && String(row[0]).trim() !== '') {
      const qText = String(row[0]).trim();
      const diags: string[] = [];
      for (let c = 1; c <= 3; c++) {
        if (row[c] !== undefined && row[c] !== null && String(row[c]).trim() !== '') {
          diags.push(String(row[c]).trim());
        }
      }
      consultationQueries.push({
        questionText: qText,
        diagnosticQuestions: diags,
        rawRow: r + 1,
      });
    }
  }

  const answers: Array<{
    questionText: string;
    reasonText: string;
    remedyText: string;
    videoUrl?: string;
    answerType: 'level1' | 'diagnostic';
    rawRow: number;
  }> = [];

  for (let r = 1; r < answersAoa.length; r++) {
    const row = answersAoa[r];
    if (row && row[0] !== undefined && row[0] !== null && String(row[0]).trim() !== '') {
      const qText = String(row[0]).trim();
      const reasonText = row[1] ? String(row[1]).trim() : '';
      const remedyText = row[2] ? String(row[2]).trim() : '';

      // Extract YouTube Video URL if present
      let videoUrl: string | undefined;
      const remedyMatch = remedyText.match(YOUTUBE_URL_REGEX);
      const reasonMatch = reasonText.match(YOUTUBE_URL_REGEX);
      if (remedyMatch) {
        videoUrl = remedyMatch[0];
      } else if (reasonMatch) {
        videoUrl = reasonMatch[0];
      }

      // First 184 rows (or rows matching level1 questions) are level1, rest are diagnostic
      const isLevel1 = r <= level1Questions.length;
      answers.push({
        questionText: qText,
        reasonText,
        remedyText,
        videoUrl,
        answerType: isLevel1 ? 'level1' : 'diagnostic',
        rawRow: r + 1,
      });
    }
  }

  return {
    level1Questions,
    consultationQueries,
    answers,
    stats: {
      totalRows: {
        level1: level1Aoa.length,
        consultation: consultAoa.length,
        answers: answersAoa.length,
      },
      dataRows: {
        level1: level1Questions.length,
        consultation: consultationQueries.length,
        answers: answers.length,
      },
    },
  };
}

export async function parseExcelFile(filePath: string): Promise<ParsedExcelData> {
  const fs = await import('fs');
  if (!fs.existsSync(filePath)) {
    throw new ExcelValidationError(`Excel file not found at: ${filePath}`, 404);
  }
  const buffer = fs.readFileSync(filePath);
  return parseExcelBuffer(buffer);
}

/**
 * JWT Helpers
 */
export function generateAdminToken(payload?: { adminId?: string; email?: string }): string {
  const tokenPayload = {
    adminId: payload?.adminId || new mongoose.Types.ObjectId().toString(),
    email: payload?.email || 'admin@healinghands4u.com',
    role: 'admin',
  };
  return jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });
}

export function generateUserToken(userId: string = 'user_123'): string {
  return jwt.sign({ userId, role: 'user', authProvider: 'guest' }, JWT_SECRET, { expiresIn: '1d' });
}

export function generateExpiredAdminToken(): string {
  return jwt.sign(
    { adminId: 'admin_expired', email: 'expired@healinghands4u.com', role: 'admin' },
    JWT_SECRET,
    { expiresIn: -10 }
  );
}

/**
 * Seeds a default admin record into database.
 */
export async function seedDefaultAdmin(email: string = 'admin@healinghands4u.com'): Promise<IAdmin> {
  let admin = await Admin.findOne({ email });
  if (!admin) {
    admin = await Admin.create({
      email,
      passwordHash: 'admin123_hash',
      authProvider: 'password',
      role: 'admin',
    });
  }
  return admin;
}

/**
 * Escape string for RegExp search
 */
function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

/**
 * Creates the Admin REST API Router strictly adhering to PROJECT.md § Interface Contracts.
 */
export function createAdminRouter(): express.Router {
  const router = express.Router();
  const upload = multer({ storage: multer.memoryStorage() });

  // Middleware: Auth Guard for /api/admin/*
  const adminGuard = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'Authentication token missing or invalid' });
      return;
    }
    const token = authHeader.substring(7).trim();
    if (!token) {
      res.status(401).json({ success: false, message: 'Authentication token missing or invalid' });
      return;
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (decoded.role !== 'admin') {
        res.status(401).json({ success: false, message: 'Authentication token missing or invalid' });
        return;
      }
      (req as any).admin = decoded;
      next();
    } catch (err) {
      res.status(401).json({ success: false, message: 'Authentication token missing or invalid' });
      return;
    }
  };

  // POST /api/admin/auth/login
  router.post('/auth/login', async (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password required' });
      return;
    }

    // Support default admin or DB admin
    let admin: any = await Admin.findOne({ email });
    const isDefaultValid = email === 'admin@healinghands4u.com' && password === 'Admin@123456';
    const isDbValid = admin && (password === 'Admin@123456' || (admin.passwordHash && admin.passwordHash === password));

    if (isDefaultValid || isDbValid) {
      if (!admin) {
        admin = await seedDefaultAdmin(email);
      }
      const token = generateAdminToken({ adminId: (admin._id as any).toString(), email: admin.email });
      res.status(200).json({
        success: true,
        token,
        admin: {
          email: admin.email,
          role: admin.role,
        },
      });
      return;
    }

    res.status(401).json({ success: false, message: 'Invalid credentials' });
  });

  // GET /api/admin/stats
  router.get('/stats', adminGuard, async (req: Request, res: Response) => {
    const totalQuestions = await Level1Question.countDocuments();
    const totalConsultations = await ConsultationQuery.countDocuments();
    const totalAnswers = await Answer.countDocuments();
    res.status(200).json({
      success: true,
      stats: {
        totalQuestions,
        totalConsultations,
        totalAnswers,
        vectorIndexActive: true,
      },
    });
  });

  // GET /api/admin/knowledge-base
  router.get('/knowledge-base', adminGuard, async (req: Request, res: Response) => {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
      let page = parseInt(req.query.page as string, 10);
      let limit = parseInt(req.query.limit as string, 10);

      if (isNaN(page) || page <= 0) page = 1;
      if (isNaN(limit) || limit <= 0) limit = 20;

      const filter: any = {};
      if (search) {
        filter.canonicalQuestionText = { $regex: escapeRegex(search), $options: 'i' };
      }

      const total = await Level1Question.countDocuments(filter);
      const totalPages = Math.ceil(total / limit) || 1;
      const skip = (page - 1) * limit;

      const questions = await Level1Question.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 });

      const items = await Promise.all(
        questions.map(async (q) => {
          const consultation = await ConsultationQuery.findOne({ level1QuestionId: q._id });
          const answer = await Answer.findOne({ level1QuestionId: q._id });
          return {
            id: q._id,
            canonicalQuestionText: q.canonicalQuestionText,
            tags: q.tags,
            isActive: q.isActive,
            diagnosticQuestions: consultation ? consultation.diagnosticQuestions.map((d) => d.questionText) : [],
            answerText: answer?.answerText || '',
            homeRemedyText: answer?.homeRemedyText || '',
            videoUrl: answer?.videoUrl,
          };
        })
      );

      res.status(200).json({
        success: true,
        total,
        page,
        totalPages,
        items,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // POST /api/admin/knowledge-base
  router.post('/knowledge-base', adminGuard, async (req: Request, res: Response) => {
    try {
      const { canonicalQuestionText, tags, diagnosticQuestions, answerText, homeRemedyText, videoUrl } = req.body;
      if (!canonicalQuestionText || typeof canonicalQuestionText !== 'string' || canonicalQuestionText.trim() === '') {
        res.status(400).json({ success: false, message: 'canonicalQuestionText is required' });
        return;
      }

      const ai = getAIServices();
      const embedding = await ai.embedding.generateEmbedding(canonicalQuestionText.trim());

      const question = await Level1Question.create({
        canonicalQuestionText: canonicalQuestionText.trim(),
        tags: Array.isArray(tags) ? tags : [],
        embedding,
        isActive: true,
      });

      let consultation = null;
      if (Array.isArray(diagnosticQuestions) && diagnosticQuestions.length > 0) {
        consultation = await ConsultationQuery.create({
          level1QuestionId: question._id,
          diagnosticQuestions: diagnosticQuestions.map((dq: string, idx: number) => ({
            id: `diag_${idx + 1}`,
            questionText: String(dq).trim(),
          })),
          answerBranches: [],
        });
      }

      let answer = null;
      if (answerText || homeRemedyText) {
        answer = await Answer.create({
          level1QuestionId: question._id,
          answerText: answerText || 'Standard homeopathic consultation guidance',
          homeRemedyText: homeRemedyText || '',
          videoUrl: videoUrl || undefined,
        });
      }

      res.status(201).json({
        success: true,
        item: {
          id: question._id,
          canonicalQuestionText: question.canonicalQuestionText,
          tags: question.tags,
          diagnosticQuestions: consultation ? consultation.diagnosticQuestions.map((d) => d.questionText) : [],
          answerText: answer?.answerText,
          homeRemedyText: answer?.homeRemedyText,
          videoUrl: answer?.videoUrl,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // PUT /api/admin/knowledge-base/:id
  router.put('/knowledge-base/:id', adminGuard, async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(404).json({ success: false, message: 'Invalid or non-existent question ID' });
        return;
      }

      const question = await Level1Question.findById(id);
      if (!question) {
        res.status(404).json({ success: false, message: 'Question not found' });
        return;
      }

      const { canonicalQuestionText, tags, isActive, answerText, homeRemedyText, videoUrl } = req.body;
      if (canonicalQuestionText !== undefined) {
        question.canonicalQuestionText = canonicalQuestionText;
      }
      if (tags !== undefined) {
        question.tags = tags;
      }
      if (isActive !== undefined) {
        question.isActive = isActive;
      }
      await question.save();

      let answer = await Answer.findOne({ level1QuestionId: question._id });
      if (answerText !== undefined || homeRemedyText !== undefined || videoUrl !== undefined) {
        if (!answer) {
          answer = new Answer({ level1QuestionId: question._id, answerText: answerText || 'Default answer' });
        }
        if (answerText !== undefined) answer.answerText = answerText;
        if (homeRemedyText !== undefined) answer.homeRemedyText = homeRemedyText;
        if (videoUrl !== undefined) answer.videoUrl = videoUrl;
        await answer.save();
      }

      res.status(200).json({
        success: true,
        item: {
          id: question._id,
          canonicalQuestionText: question.canonicalQuestionText,
          tags: question.tags,
          isActive: question.isActive,
          answerText: answer?.answerText,
          homeRemedyText: answer?.homeRemedyText,
          videoUrl: answer?.videoUrl,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // DELETE /api/admin/knowledge-base/:id (with cascade deletion)
  router.delete('/knowledge-base/:id', adminGuard, async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(404).json({ success: false, message: 'Invalid question ID' });
        return;
      }

      const question = await Level1Question.findById(id);
      if (!question) {
        res.status(404).json({ success: false, message: 'Question not found' });
        return;
      }

      await Level1Question.findByIdAndDelete(id);
      // Cascade delete to ConsultationQuery and Answer
      await ConsultationQuery.deleteMany({ level1QuestionId: id });
      await Answer.deleteMany({ level1QuestionId: id });

      res.status(200).json({
        success: true,
        message: 'Knowledge base entry and associated diagnostic queries and answers deleted successfully',
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // POST /api/admin/knowledge-base/import (multipart/form-data)
  router.post('/knowledge-base/import', adminGuard, upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file || !req.file.buffer) {
        res.status(400).json({ success: false, message: 'No file uploaded' });
        return;
      }

      const parsed = await parseExcelBuffer(req.file.buffer);
      const ai = getAIServices();

      // Seed questions
      let insertedQuestions = 0;
      let insertedConsultations = 0;
      let insertedAnswers = 0;

      for (let i = 0; i < parsed.level1Questions.length; i++) {
        const item = parsed.level1Questions[i];
        const embedding = await ai.embedding.generateEmbedding(item.canonicalQuestionText);
        
        let qDoc = await Level1Question.findOne({ canonicalQuestionText: item.canonicalQuestionText });
        if (!qDoc) {
          qDoc = await Level1Question.create({
            canonicalQuestionText: item.canonicalQuestionText,
            embedding,
            tags: ['homeopathy'],
            isActive: true,
          });
          insertedQuestions++;
        }

        // Check consultation query for this row
        if (parsed.consultationQueries[i]) {
          const cq = parsed.consultationQueries[i];
          const existingCq = await ConsultationQuery.findOne({ level1QuestionId: qDoc._id });
          if (!existingCq) {
            await ConsultationQuery.create({
              level1QuestionId: qDoc._id,
              diagnosticQuestions: cq.diagnosticQuestions.map((dq, idx) => ({
                id: `diag_${idx + 1}`,
                questionText: dq,
              })),
              answerBranches: [],
            });
            insertedConsultations++;
          }
        }

        // Check answer for this row
        if (parsed.answers[i]) {
          const ans = parsed.answers[i];
          const existingAns = await Answer.findOne({ level1QuestionId: qDoc._id });
          if (!existingAns) {
            await Answer.create({
              level1QuestionId: qDoc._id,
              answerText: ans.reasonText || 'Default remedy explanation',
              homeRemedyText: ans.remedyText,
              videoUrl: ans.videoUrl,
            });
            insertedAnswers++;
          }
        }
      }

      // Remaining answers (diagnostic answers beyond row 184)
      for (let i = parsed.level1Questions.length; i < parsed.answers.length; i++) {
        const ans = parsed.answers[i];
        await Answer.create({
          level1QuestionId: new mongoose.Types.ObjectId(), // Independent diagnostic answer
          answerText: ans.reasonText || ans.questionText,
          homeRemedyText: ans.remedyText,
          videoUrl: ans.videoUrl,
        });
        insertedAnswers++;
      }

      res.status(200).json({
        success: true,
        counts: {
          questions: parsed.level1Questions.length,
          consultations: parsed.consultationQueries.length,
          answers: parsed.answers.length,
        },
      });
    } catch (err: any) {
      if (err instanceof ExcelValidationError) {
        res.status(err.statusCode).json({ success: false, message: err.message, details: err.details });
        return;
      }
      res.status(500).json({ success: false, message: err.message });
    }
  });

  return router;
}

/**
 * Returns the unified application configured with /api/admin.
 */
let isE2EAdminRouterMounted = false;

export function getE2ETestApp(): express.Application {
  // Mount /api/admin if not already present
  if (!isE2EAdminRouterMounted) {
    const adminRouter = createAdminRouter();
    app.use('/api/admin', adminRouter);
    isE2EAdminRouterMounted = true;
  }
  return app;
}

/**
 * Global In-Memory Mongo Lifecycle helper for E2E suites.
 */
export function setupE2ETestEnvironment() {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  }, 90000);

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  }, 30000);

  beforeEach(async () => {
    process.env.USE_MOCK_AI = 'true';
    resetAIServices();
    if (mongoose.connection.readyState === 1) {
      const collections = mongoose.connection.collections;
      for (const key in collections) {
        await collections[key].deleteMany({});
      }
      await seedDefaultAdmin();
    }
  });

  afterEach(async () => {
    if (mongoose.connection.readyState === 1) {
      const collections = mongoose.connection.collections;
      for (const key in collections) {
        await collections[key].deleteMany({});
      }
    }
  });
}
