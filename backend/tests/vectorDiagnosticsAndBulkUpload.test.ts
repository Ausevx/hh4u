import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app';
import Level1Question from '../src/models/Level1Question';
import ConsultationQuery from '../src/models/ConsultationQuery';
import Answer from '../src/models/Answer';
import { generateAdminToken } from '../src/utils/jwt';
import {
  isMockEmbedding,
  inspectVectorHealth,
  backfillEmbeddings,
} from '../src/services/vectorBackfillService';
import { MockEmbeddingService } from '../src/services/ai/mock/mockEmbeddingService';
import {
  createValidMinimalWorkbookBuffer,
} from './e2e/helpers/excelTestHelper';

describe('Vector Diagnostics and Bulk Upload Mode Test Suite', () => {
  let mongoServer: MongoMemoryServer;
  let adminToken: string;
  const mockEmbeddingService = new MockEmbeddingService();

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    adminToken = generateAdminToken({
      adminId: 'admin_vector_test',
      email: 'admin@healinghands4u.com',
      role: 'admin',
    });
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Level1Question.deleteMany({});
    await ConsultationQuery.deleteMany({});
    await Answer.deleteMany({});
  });

  describe('1. vectorBackfillService Unit Tests', () => {
    it('isMockEmbedding should identify mock Mulberry32 embeddings accurately', async () => {
      const text = 'When does vomiting become dangerous?';
      const mockVector = await mockEmbeddingService.generateEmbedding(text);
      expect(await isMockEmbedding(text, mockVector)).toBe(true);

      // Inverted or different vector should not be detected as mock
      const alteredVector = [...mockVector];
      alteredVector[0] = -alteredVector[0];
      alteredVector[1] = -alteredVector[1];
      expect(await isMockEmbedding(text, alteredVector)).toBe(false);

      // Short or empty vector
      expect(await isMockEmbedding(text, [])).toBe(false);
    });

    it('inspectVectorHealth should report all required fields matching specification', async () => {
      // Seed 2 questions: one with mock embedding, one without embedding
      const mockVec = await mockEmbeddingService.generateEmbedding('Sample mock question');
      await Level1Question.create({
        canonicalQuestionText: 'Sample mock question',
        embedding: mockVec,
        isActive: true,
      });
      await Level1Question.create({
        canonicalQuestionText: 'Question without embedding',
        embedding: [],
        isActive: true,
      });

      const report = await inspectVectorHealth();

      expect(report.success).toBe(true);
      expect(report.totalLevel1Questions).toBe(2);
      expect(report.questionsWithEmbeddings).toBe(1);
      expect(typeof report.vectorIndexExists).toBe('boolean');
      expect(typeof report.vectorIndexQueryable).toBe('boolean');
      expect(typeof report.geminiApiKeyConfigured).toBe('boolean');
      expect(['CONFIGURED', 'MISSING']).toContain(report.geminiApiKeyStatus);
      expect(report.details).toBeDefined();
      expect(report.details?.mockEmbeddingsCount).toBe(1);
      expect(report.details?.missingEmbeddingsCount).toBe(1);
    });

    it('backfillEmbeddings should regenerate missing embeddings in batches', async () => {
      // Create 5 questions with missing embeddings
      for (let i = 1; i <= 5; i++) {
        await Level1Question.create({
          canonicalQuestionText: `Backfill test question ${i}`,
          embedding: [],
          isActive: true,
        });
      }

      const res = await backfillEmbeddings({ force: false, batchSize: 2, delayMs: 10 });
      expect(res.success).toBe(true);
      expect(res.totalQuestions).toBe(5);
      expect(res.updatedCount).toBe(5);

      const docs = await Level1Question.find({});
      for (const doc of docs) {
        expect(doc.embedding).toBeDefined();
        expect(doc.embedding?.length).toBe(1536);
      }
    });
  });

  describe('2. Admin Vector Endpoints (GET /api/admin/vector-status & POST /api/admin/vector-sync)', () => {
    it('GET /api/admin/vector-status should return 200 without requiring auth token', async () => {
      const res = await request(app).get('/api/admin/vector-status');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('totalLevel1Questions');
      expect(res.body).toHaveProperty('questionsWithEmbeddings');
      expect(res.body).toHaveProperty('vectorIndexExists');
      expect(res.body).toHaveProperty('vectorIndexQueryable');
      expect(res.body).toHaveProperty('geminiApiKeyConfigured');
      expect(res.body).toHaveProperty('geminiApiKeyStatus');
    });

    it('POST /api/admin/vector-sync should trigger backfill and return 200', async () => {
      await Level1Question.create({
        canonicalQuestionText: 'Sync test question',
        embedding: [],
        isActive: true,
      });

      const res = await request(app)
        .post('/api/admin/vector-sync')
        .send({ force: true, batchSize: 5, delayMs: 10 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.result.updatedCount).toBe(1);
    });
  });

  describe('3. Bulk Upload Mode: Append vs Overwrite', () => {
    it('should reject invalid mode parameter with 400', async () => {
      const buffer = createValidMinimalWorkbookBuffer(2);

      const res = await request(app)
        .post('/api/admin/knowledge-base/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('mode', 'invalid_mode')
        .attach('file', buffer, 'test.xlsx');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid mode/i);
    });

    it('should preserve existing entries when mode is append (or default)', async () => {
      // Seed pre-existing question
      const existingQ = await Level1Question.create({
        canonicalQuestionText: 'Pre-existing persistent question',
        tags: ['persistent'],
        isActive: true,
        embedding: new Array(1536).fill(0.01),
      });

      const buffer = createValidMinimalWorkbookBuffer(2);

      // Upload with mode="append"
      const res = await request(app)
        .post('/api/admin/knowledge-base/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('mode', 'append')
        .attach('file', buffer, 'append_test.xlsx');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.mode).toBe('append');

      // Verify pre-existing question is still present
      const persistent = await Level1Question.findById(existingQ._id);
      expect(persistent).not.toBeNull();
      expect(persistent?.canonicalQuestionText).toBe('Pre-existing persistent question');

      // Total questions should be 1 existing + 2 imported = 3
      const totalCount = await Level1Question.countDocuments();
      expect(totalCount).toBe(3);
    });

    it('should wipe existing entries when mode is overwrite', async () => {
      // Seed pre-existing question, consultation, answer
      const oldQ = await Level1Question.create({
        canonicalQuestionText: 'Old obsolete question',
        tags: ['obsolete'],
        isActive: true,
        embedding: new Array(1536).fill(0.01),
      });
      await ConsultationQuery.create({
        level1QuestionId: oldQ._id,
        diagnosticQuestions: [{ id: 'dq1', questionText: 'Obsolete diag?' }],
      });
      await Answer.create({
        level1QuestionId: oldQ._id,
        questionText: 'Old obsolete question',
        answerText: 'Obsolete answer',
      });

      expect(await Level1Question.countDocuments()).toBe(1);
      expect(await ConsultationQuery.countDocuments()).toBe(1);
      expect(await Answer.countDocuments()).toBe(1);

      const buffer = createValidMinimalWorkbookBuffer(2);

      // Upload with mode="overwrite"
      const res = await request(app)
        .post('/api/admin/knowledge-base/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('mode', 'overwrite')
        .attach('file', buffer, 'overwrite_test.xlsx');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.mode).toBe('overwrite');

      // Old entries should be completely deleted
      const foundOldQ = await Level1Question.findById(oldQ._id);
      expect(foundOldQ).toBeNull();
      const foundOldCq = await ConsultationQuery.findOne({ level1QuestionId: oldQ._id });
      expect(foundOldCq).toBeNull();
      const foundOldAns = await Answer.findOne({ level1QuestionId: oldQ._id });
      expect(foundOldAns).toBeNull();

      // Only the 2 new questions should exist
      expect(await Level1Question.countDocuments()).toBe(2);
      expect(await ConsultationQuery.countDocuments()).toBe(2);
      expect(await Answer.countDocuments()).toBe(2);
    });
  });
});
