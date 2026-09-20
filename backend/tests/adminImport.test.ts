import request from 'supertest';
import mongoose from 'mongoose';
import * as path from 'path';
import * as fs from 'fs';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app';
import Level1Question from '../src/models/Level1Question';
import ConsultationQuery from '../src/models/ConsultationQuery';
import Answer from '../src/models/Answer';
import { generateAdminToken, generateToken } from '../src/utils/jwt';
import { resetAIServices } from '../src/services/ai/aiContainer';
import {
  createValidMinimalWorkbookBuffer,
  createMissingSheetWorkbookBuffer,
  createMissingColumnWorkbookBuffer,
  createCorruptedBuffer,
} from './e2e/helpers/excelTestHelper';

const DUMMY_EXCEL_PATH = path.resolve(__dirname, '../../database-dummy.xlsx');

describe('Multipart Excel Import REST API Test Suite', () => {
  let mongoServer: MongoMemoryServer;
  let adminToken: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    adminToken = generateAdminToken({
      adminId: 'admin_import_tester',
      email: 'admin@healinghands4u.com',
      role: 'admin',
    });
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    resetAIServices();
    await Level1Question.deleteMany({});
    await ConsultationQuery.deleteMany({});
    await Answer.deleteMany({});
  });

  // ==========================================================================
  // 1. Authentication & Security Guard
  // ==========================================================================
  describe('Authentication & Authorization', () => {
    it('should reject unauthenticated upload with 401 before reading or processing file', async () => {
      const validBuffer = createValidMinimalWorkbookBuffer(2);

      const res = await request(app)
        .post('/api/admin/knowledge-base/import')
        .attach('file', validBuffer, 'import.xlsx');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Authentication token missing or invalid');

      // Ensure no database side-effects occurred
      const count = await Level1Question.countDocuments();
      expect(count).toBe(0);
    });

    it('should reject non-admin user tokens with 401', async () => {
      const userToken = generateToken({
        userId: 'user_regular_123',
        authProvider: 'guest',
      });
      const validBuffer = createValidMinimalWorkbookBuffer(2);

      const res = await request(app)
        .post('/api/admin/knowledge-base/import')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('file', validBuffer, 'import.xlsx');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Authentication token missing or invalid');
    });
  });

  // ==========================================================================
  // 2. Validation & Boundary Failures
  // ==========================================================================
  describe('Validation & Boundary Failures', () => {
    it('should reject requests with missing file field with 400', async () => {
      const res = await request(app)
        .post('/api/admin/knowledge-base/import')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/no file/i);
    });

    it('should reject non-xlsx files (e.g. .txt extension) with 400', async () => {
      const textBuffer = Buffer.from('This is a plain text file pretending to be spreadsheet');

      const res = await request(app)
        .post('/api/admin/knowledge-base/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', textBuffer, 'report.txt');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/only excel \(\.xlsx\) files are supported/i);
    });

    it('should reject corrupted non-zip binary file with 400', async () => {
      const corrupted = createCorruptedBuffer();

      const res = await request(app)
        .post('/api/admin/knowledge-base/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', corrupted, 'corrupted.xlsx');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/corrupted or invalid excel/i);
    });

    it('should reject workbook missing required sheet (e.g. Answers) and preserve clean state', async () => {
      const missingAnswers = createMissingSheetWorkbookBuffer('Answers');

      const res = await request(app)
        .post('/api/admin/knowledge-base/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', missingAnswers, 'missing_answers.xlsx');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/missing required sheet.*answers/i);

      // Verify zero records were written
      expect(await Level1Question.countDocuments()).toBe(0);
      expect(await ConsultationQuery.countDocuments()).toBe(0);
      expect(await Answer.countDocuments()).toBe(0);
    });

    it('should reject workbook missing required column header (e.g. Questions in level1)', async () => {
      const missingCol = createMissingColumnWorkbookBuffer('level1', 0);

      const res = await request(app)
        .post('/api/admin/knowledge-base/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', missingCol, 'missing_col.xlsx');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/missing required header/i);
      expect(await Level1Question.countDocuments()).toBe(0);
    });
  });

  // ==========================================================================
  // 3. Successful Ingestion & Idempotency
  // ==========================================================================
  describe('Successful Ingestion & Idempotency', () => {
    it('should successfully ingest minimal valid workbook with 3 questions, consultations, and answers', async () => {
      const validBuffer = createValidMinimalWorkbookBuffer(3);

      const res = await request(app)
        .post('/api/admin/knowledge-base/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', validBuffer, 'valid_dataset.xlsx');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.counts.questions).toBe(3);
      expect(res.body.counts.consultations).toBe(3);
      expect(res.body.counts.answers).toBe(3);

      // Verify database persistence
      const questions = await Level1Question.find({});
      expect(questions).toHaveLength(3);
      for (const q of questions) {
        expect(q.embedding).toHaveLength(1536);
        expect(q.isActive).toBe(true);

        const cq = await ConsultationQuery.findOne({ level1QuestionId: q._id });
        expect(cq).not.toBeNull();
        expect(cq?.diagnosticQuestions).toHaveLength(3);

        const ans = await Answer.findOne({ level1QuestionId: q._id });
        expect(ans).not.toBeNull();
      }
    });

    it('should be idempotent: re-uploading the same spreadsheet updates rather than duplicates', async () => {
      const validBuffer = createValidMinimalWorkbookBuffer(3);

      // Upload 1
      const res1 = await request(app)
        .post('/api/admin/knowledge-base/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', validBuffer, 'valid_dataset.xlsx');
      expect(res1.status).toBe(200);
      expect(await Level1Question.countDocuments()).toBe(3);

      // Upload 2 (same dataset)
      const res2 = await request(app)
        .post('/api/admin/knowledge-base/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', validBuffer, 'valid_dataset.xlsx');
      expect(res2.status).toBe(200);
      expect(res2.body.counts.questions).toBe(3);

      // Verify count did not double
      expect(await Level1Question.countDocuments()).toBe(3);
      expect(await ConsultationQuery.countDocuments()).toBe(3);
      expect(await Answer.countDocuments()).toBe(3);
    });

    it('should successfully import full database-dummy.xlsx with 184 questions and 220 answers', async () => {
      if (!fs.existsSync(DUMMY_EXCEL_PATH)) {
        console.warn(`File ${DUMMY_EXCEL_PATH} not found; skipping full seed test`);
        return;
      }

      const fileBuffer = fs.readFileSync(DUMMY_EXCEL_PATH);

      const res = await request(app)
        .post('/api/admin/knowledge-base/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', fileBuffer, 'database-dummy.xlsx');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.counts.questions).toBe(184);
      expect(res.body.counts.consultations).toBe(184);
      expect(res.body.counts.answers).toBe(220);

      // Verify actual counts in MongoDB collections
      const totalQ = await Level1Question.countDocuments();
      const totalCq = await ConsultationQuery.countDocuments();
      const totalAns = await Answer.countDocuments();

      expect(totalQ).toBe(184);
      expect(totalCq).toBe(184);
      expect(totalAns).toBe(220);
    });
  });
});
