import request from 'supertest';
import mongoose from 'mongoose';
import * as path from 'path';
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
  createCustomWorkbookBuffer,
} from './e2e/helpers/excelTestHelper';

/**
 * Challenger 2 Stress Test Suite for Milestone M3:
 * - Search Regex Escaping & NoSQL Injection Attacks
 * - Pagination Boundaries & Parameter Fuzzing
 * - Embedding Vector Integrity (1536 dimensions & unit L2 norm) on CRUD
 * - Referential Cascade Delete Stress & Isolation
 * - Multipart Excel Upload Stress (auth guard, >20MB limit, non-xlsx, corrupted binary, missing sheets/cols, zero state corruption)
 */
describe('Challenger 2 M3 Stress & Adversarial Test Suite', () => {
  let mongoServer: MongoMemoryServer;
  let adminToken: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    adminToken = generateAdminToken({
      adminId: 'challenger2_admin_id',
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
  // Group 1: Search Regex Escaping and Injection Stress Testing
  // ==========================================================================
  describe('Group 1: Search Regex Escaping & Injection Stress', () => {
    beforeEach(async () => {
      // Seed knowledge base entries with varied text including symbols
      const q1 = await Level1Question.create({
        canonicalQuestionText: 'How to cure migraine with Belladonna 30C?',
        tags: ['migraine', 'headache', 'belladonna'],
        isActive: true,
      });
      await Answer.create({
        level1QuestionId: q1._id,
        questionText: q1.canonicalQuestionText,
        answerText: 'Belladonna is indicated for throbbing pain.',
        reasonText: 'Congestion in cerebral vessels.',
        remedyText: 'Take Belladonna 30C 4 pills twice daily.',
        answerType: 'level1',
      });

      const q2 = await Level1Question.create({
        canonicalQuestionText: 'Is (chronic) asthma treated with arsenicum?',
        tags: ['asthma', 'respiratory'],
        isActive: true,
      });
      await Answer.create({
        level1QuestionId: q2._id,
        questionText: q2.canonicalQuestionText,
        answerText: 'Arsenicum album relieves nighttime shortness of breath.',
        reasonText: 'Bronchial spasms with restlessness.',
        remedyText: 'Arsenicum album 200CH 3 drops in water.',
        answerType: 'level1',
      });

      const q3 = await Level1Question.create({
        canonicalQuestionText: 'Formula: a+b*c [test] {bracket} ^anchor$ /regex/ \\backslash',
        tags: ['special-chars', 'symbols'],
        isActive: true,
      });
      await Answer.create({
        level1QuestionId: q3._id,
        questionText: q3.canonicalQuestionText,
        answerText: 'Symbols: (.*) wildcard test with +++ pluses and ??? marks.',
        reasonText: 'Reason with [brackets] and {braces}.',
        remedyText: 'Remedy text with $dollar and ^caret.',
        answerType: 'level1',
      });
    });

    const adversarialRegexPatterns = [
      { name: 'lone unescaped bracket', query: '[' },
      { name: 'unclosed parenthesis', query: '(((' },
      { name: 'unclosed curly brace', query: '{5,' },
      { name: 'lone asterisk quantifier', query: '*' },
      { name: 'lone plus quantifier', query: '+' },
      { name: 'repeated pluses', query: '+++' },
      { name: 'lone question mark', query: '?' },
      { name: 'trailing backslash', query: '\\' },
      { name: 'caret anchor alone', query: '^' },
      { name: 'dollar anchor alone', query: '$' },
      { name: 'nested group catastrophic backtrack attempt', query: '(a+)+$' },
      { name: 'dot star wildcard', query: '.*' },
      { name: 'regex alternation', query: 'migraine|asthma' },
    ];

    for (const testCase of adversarialRegexPatterns) {
      it(`should safely handle regex adversarial pattern: "${testCase.name}" (${testCase.query}) without 500 error`, async () => {
        const res = await request(app)
          .get('/api/admin/knowledge-base')
          .set('Authorization', `Bearer ${adminToken}`)
          .query({ search: testCase.query });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.items)).toBe(true);
        expect(typeof res.body.total).toBe('number');
      });
    }

    it('should match literal characters rather than regex operators (e.g. .* does not return all records)', async () => {
      // Searching for literal ".*" should ONLY match q3 where "(.*)" is present in answerText
      const res = await request(app)
        .get('/api/admin/knowledge-base')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ search: '.*' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.total).toBe(1);
      expect(res.body.items[0].canonicalQuestionText).toContain('Formula: a+b*c');
    });

    it('should match literal alternation "migraine|asthma" without treating pipe as boolean OR', async () => {
      const res = await request(app)
        .get('/api/admin/knowledge-base')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ search: 'migraine|asthma' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Neither entry contains literal "migraine|asthma"
      expect(res.body.total).toBe(0);
      expect(res.body.items.length).toBe(0);
    });

    it('should safely deflect NoSQL query injection payloads in search query', async () => {
      // Passing an object via query string e.g. search[$ne]=null
      const res1 = await request(app)
        .get('/api/admin/knowledge-base?search[$ne]=null')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res1.status).toBe(200);
      expect(res1.body.success).toBe(true);
      // Controller defaults non-string to '' so returns all or paginated items safely without crash
      expect(res1.body.total).toBe(3);

      // Passing search[$gt]=
      const res2 = await request(app)
        .get('/api/admin/knowledge-base?search[$gt]=')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res2.status).toBe(200);
      expect(res2.body.success).toBe(true);
      expect(res2.body.total).toBe(3);

      // Passing array query search[]=a&search[]=b
      const res3 = await request(app)
        .get('/api/admin/knowledge-base?search[]=a&search[]=b')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res3.status).toBe(200);
      expect(res3.body.success).toBe(true);
      expect(res3.body.total).toBe(3);
    });

    it('should safely search across answer remedy and reason texts', async () => {
      const remedyRes = await request(app)
        .get('/api/admin/knowledge-base')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ search: '200CH' });

      expect(remedyRes.status).toBe(200);
      expect(remedyRes.body.total).toBe(1);
      expect(remedyRes.body.items[0].canonicalQuestionText).toContain('asthma');

      const reasonRes = await request(app)
        .get('/api/admin/knowledge-base')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ search: 'cerebral vessels' });

      expect(reasonRes.status).toBe(200);
      expect(reasonRes.body.total).toBe(1);
      expect(reasonRes.body.items[0].canonicalQuestionText).toContain('migraine');
    });

    it('should safely handle Unicode and multilingual search terms', async () => {
      const res = await request(app)
        .get('/api/admin/knowledge-base')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ search: 'संस्कृत / 症状 / café' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.total).toBe(0);
      expect(res.body.items.length).toBe(0);
    });
  });

  // ==========================================================================
  // Group 2: Pagination Boundaries & Parameter Fuzzing
  // ==========================================================================
  describe('Group 2: Pagination Boundaries & Parameter Fuzzing', () => {
    beforeEach(async () => {
      // Seed 25 items for pagination testing
      const docs = [];
      for (let i = 1; i <= 25; i++) {
        docs.push({
          canonicalQuestionText: `Boundary Question ${String(i).padStart(2, '0')}?`,
          tags: ['boundary'],
          isActive: true,
        });
      }
      await Level1Question.insertMany(docs);
    });

    it('should normalize negative page and limit parameters to defaults (page=1, limit=20)', async () => {
      const res = await request(app)
        .get('/api/admin/knowledge-base')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: -5, limit: -10 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.page).toBe(1);
      expect(res.body.total).toBe(25);
      expect(res.body.items.length).toBe(20);
    });

    it('should normalize zero page and zero limit to defaults (page=1, limit=20)', async () => {
      const res = await request(app)
        .get('/api/admin/knowledge-base')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 0, limit: 0 });

      expect(res.status).toBe(200);
      expect(res.body.page).toBe(1);
      expect(res.body.items.length).toBe(20);
    });

    it('should normalize non-numeric page and limit strings to defaults', async () => {
      const res = await request(app)
        .get('/api/admin/knowledge-base')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 'not-a-number', limit: 'xyz' });

      expect(res.status).toBe(200);
      expect(res.body.page).toBe(1);
      expect(res.body.items.length).toBe(20);
    });

    it('should clamp massive limit to maximum ceiling of 100', async () => {
      const res = await request(app)
        .get('/api/admin/knowledge-base')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 999999 });

      expect(res.status).toBe(200);
      expect(res.body.page).toBe(1);
      // All 25 items returned since 25 < 100 max ceiling
      expect(res.body.items.length).toBe(25);
    });

    it('should return empty items array when page is far beyond totalPages without crashing', async () => {
      const res = await request(app)
        .get('/api/admin/knowledge-base')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 999999, limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.total).toBe(25);
      expect(res.body.totalPages).toBe(3);
      expect(res.body.page).toBe(999999);
      expect(res.body.items).toEqual([]);
    });

    it('should reject malformed ObjectIds with 400 on GET', async () => {
      const malformedIds = ['invalid-id', '12345', 'undefined', 'null', 'true', '507f1f77bcf86cd79943901z'];
      for (const id of malformedIds) {
        const res = await request(app)
          .get(`/api/admin/knowledge-base/${id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Invalid question ID format');
      }
    });

    it('should return 404 for non-existent valid ObjectId on GET', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/admin/knowledge-base/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Question not found');
    });

    it('should return 404 for invalid ObjectId on PUT and DELETE', async () => {
      const invalidId = 'not-a-valid-id';

      const putRes = await request(app)
        .put(`/api/admin/knowledge-base/${invalidId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ canonicalQuestionText: 'Updated Question' });

      expect(putRes.status).toBe(404);
      expect(putRes.body.success).toBe(false);

      const delRes = await request(app)
        .delete(`/api/admin/knowledge-base/${invalidId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(delRes.status).toBe(404);
      expect(delRes.body.success).toBe(false);
    });
  });

  // ==========================================================================
  // Group 3: Embedding Vector Integrity on CRUD
  // ==========================================================================
  describe('Group 3: Embedding Vector Integrity (1536-Dim & Unit Norm)', () => {
    it('should verify 1536-dimensional unit vector embedding upon creation', async () => {
      const res = await request(app)
        .post('/api/admin/knowledge-base')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          canonicalQuestionText: 'What is the remedy for allergic rhinitis?',
          tags: ['allergy', 'rhinitis'],
          diagnosticQuestions: ['Is sneezing frequent in mornings?'],
          answerText: 'Allium Cepa is recommended for profuse watery coryza.',
          remedyText: 'Allium Cepa 30C',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const createdId = res.body.item.id;

      // Verify directly from MongoDB document
      const doc = await Level1Question.findById(createdId);
      expect(doc).not.toBeNull();
      expect(Array.isArray(doc!.embedding)).toBe(true);
      expect(doc!.embedding!.length).toBe(1536);

      // Verify all elements are finite numbers
      for (const val of doc!.embedding!) {
        expect(typeof val).toBe('number');
        expect(isFinite(val)).toBe(true);
        expect(isNaN(val)).toBe(false);
      }

      // Verify L2 unit norm = 1.0 (+/- 1e-4)
      const norm = Math.sqrt(doc!.embedding!.reduce((acc, v) => acc + v * v, 0));
      expect(Math.abs(norm - 1.0)).toBeLessThan(1e-4);
    });

    it('should regenerate 1536-dimensional unit vector when question text changes on update', async () => {
      // 1. Create initial question
      const createRes = await request(app)
        .post('/api/admin/knowledge-base')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          canonicalQuestionText: 'Headache remedies for throbbing temples',
          answerText: 'Belladonna',
        });

      expect(createRes.status).toBe(201);
      const id = createRes.body.item.id;

      const initialDoc = await Level1Question.findById(id);
      const initialEmbedding = [...initialDoc!.embedding!];

      // 2. Update question text
      const updateRes = await request(app)
        .put(`/api/admin/knowledge-base/${id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          canonicalQuestionText: 'Gastric issues and acid reflux symptoms',
        });

      expect(updateRes.status).toBe(200);

      const updatedDoc = await Level1Question.findById(id);
      expect(updatedDoc!.embedding!.length).toBe(1536);

      // Verify L2 unit norm
      const norm = Math.sqrt(updatedDoc!.embedding!.reduce((acc, v) => acc + v * v, 0));
      expect(Math.abs(norm - 1.0)).toBeLessThan(1e-4);

      // Verify embedding changed to reflect new semantic text
      expect(updatedDoc!.embedding).not.toEqual(initialEmbedding);
    });

    it('should preserve existing embedding when updating non-question fields', async () => {
      const createRes = await request(app)
        .post('/api/admin/knowledge-base')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          canonicalQuestionText: 'Consistent embedding question',
          tags: ['initial'],
          answerText: 'Initial answer',
        });

      const id = createRes.body.item.id;
      const initialDoc = await Level1Question.findById(id);
      const initialEmbedding = [...initialDoc!.embedding!];

      // Update only tags and answerText
      const updateRes = await request(app)
        .put(`/api/admin/knowledge-base/${id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tags: ['updated-tag-1', 'updated-tag-2'],
          answerText: 'Modified remedy advice.',
        });

      expect(updateRes.status).toBe(200);

      const afterDoc = await Level1Question.findById(id);
      expect(afterDoc!.embedding).toEqual(initialEmbedding);
    });
  });

  // ==========================================================================
  // Group 4: Referential Cascade Delete Integrity & Isolation
  // ==========================================================================
  describe('Group 4: Referential Cascade Delete Integrity & Isolation', () => {
    it('should cascade delete Question and all associated ConsultationQueries and multiple Answers leaving zero orphans', async () => {
      // 1. Create a question
      const createRes = await request(app)
        .post('/api/admin/knowledge-base')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          canonicalQuestionText: 'Parent Question for Cascade Test?',
          diagnosticQuestions: ['Diag 1?', 'Diag 2?'],
          answerText: 'Primary answer text',
          remedyText: 'Remedy A',
        });

      expect(createRes.status).toBe(201);
      const qId = new mongoose.Types.ObjectId(createRes.body.item.id);

      // 2. Add additional diagnostic answers linked to this question
      await Answer.create([
        {
          level1QuestionId: qId,
          questionText: 'Parent Question for Cascade Test?',
          answerText: 'Branch answer 1',
          answerType: 'diagnostic',
        },
        {
          level1QuestionId: qId,
          questionText: 'Parent Question for Cascade Test?',
          answerText: 'Branch answer 2',
          answerType: 'diagnostic',
        },
      ]);

      // Verify documents exist prior to delete
      expect(await Level1Question.countDocuments({ _id: qId })).toBe(1);
      expect(await ConsultationQuery.countDocuments({ level1QuestionId: qId })).toBe(1);
      expect(await Answer.countDocuments({ level1QuestionId: qId })).toBe(3); // 1 primary + 2 diagnostic

      // 3. Perform cascade delete
      const delRes = await request(app)
        .delete(`/api/admin/knowledge-base/${qId.toString()}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);
      expect(delRes.body.deletedCount.questions).toBe(1);
      expect(delRes.body.deletedCount.consultations).toBe(1);
      expect(delRes.body.deletedCount.answers).toBe(3);

      // 4. Verify ZERO orphaned documents remain in database
      const remainingQuestions = await Level1Question.find({ _id: qId });
      const remainingConsults = await ConsultationQuery.find({ level1QuestionId: qId });
      const remainingAnswers = await Answer.find({ level1QuestionId: qId });

      expect(remainingQuestions.length).toBe(0);
      expect(remainingConsults.length).toBe(0);
      expect(remainingAnswers.length).toBe(0);
    });

    it('should maintain strict entity isolation during cascade delete (other questions untouched)', async () => {
      // Question A
      const qA = await Level1Question.create({ canonicalQuestionText: 'Question A?' });
      await ConsultationQuery.create({ level1QuestionId: qA._id, diagnosticQuestions: [] });
      await Answer.create({ level1QuestionId: qA._id, questionText: 'Question A?', answerText: 'Ans A' });

      // Question B
      const qB = await Level1Question.create({ canonicalQuestionText: 'Question B?' });
      await ConsultationQuery.create({ level1QuestionId: qB._id, diagnosticQuestions: [] });
      await Answer.create({ level1QuestionId: qB._id, questionText: 'Question B?', answerText: 'Ans B1' });
      await Answer.create({ level1QuestionId: qB._id, questionText: 'Question B?', answerText: 'Ans B2' });

      // Delete Question A
      const delRes = await request(app)
        .delete(`/api/admin/knowledge-base/${qA._id.toString()}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(delRes.status).toBe(200);

      // Verify Question A removed
      expect(await Level1Question.findById(qA._id)).toBeNull();
      expect(await ConsultationQuery.countDocuments({ level1QuestionId: qA._id })).toBe(0);
      expect(await Answer.countDocuments({ level1QuestionId: qA._id })).toBe(0);

      // Verify Question B and its sub-documents are 100% intact
      expect(await Level1Question.findById(qB._id)).not.toBeNull();
      expect(await ConsultationQuery.countDocuments({ level1QuestionId: qB._id })).toBe(1);
      expect(await Answer.countDocuments({ level1QuestionId: qB._id })).toBe(2);
    });
  });

  // ==========================================================================
  // Group 5: Multipart Excel Upload Stress & Security
  // ==========================================================================
  describe('Group 5: Multipart Excel Upload Stress & Security', () => {
    it('should reject unauthenticated upload with 401 BEFORE parsing file', async () => {
      const validBuffer = createValidMinimalWorkbookBuffer(2);

      const res = await request(app)
        .post('/api/admin/knowledge-base/import')
        .attach('file', validBuffer, 'test.xlsx');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Authentication token missing or invalid');
    });

    it('should reject upload with non-admin user token with 401', async () => {
      const userToken = generateToken({ userId: 'user123', authProvider: 'guest' });
      const validBuffer = createValidMinimalWorkbookBuffer(2);

      const res = await request(app)
        .post('/api/admin/knowledge-base/import')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('file', validBuffer, 'test.xlsx');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject file upload exceeding 20MB limit with HTTP 400', async () => {
      // 20MB + 1KB buffer
      const oversizedBuffer = Buffer.alloc(20 * 1024 * 1024 + 1024, 0);

      const res = await request(app)
        .post('/api/admin/knowledge-base/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', oversizedBuffer, 'oversized.xlsx');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('File size exceeds maximum allowed limit (20MB)');
    });

    it('should reject non-xlsx file extensions (.csv, .pdf, .exe, .json, .xlsx.exe)', async () => {
      const forbiddenExtensions = [
        'data.csv',
        'report.pdf',
        'payload.exe',
        'data.json',
        'document.txt',
        'trick.xlsx.exe',
        'image.png',
      ];

      for (const filename of forbiddenExtensions) {
        const dummyBuffer = Buffer.from('dummy-content');
        const res = await request(app)
          .post('/api/admin/knowledge-base/import')
          .set('Authorization', `Bearer ${adminToken}`)
          .attach('file', dummyBuffer, filename);

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Only Excel (.xlsx) files are supported');
      }
    });

    it('should reject corrupted binary without ZIP magic bytes with 400', async () => {
      const corruptedBuffer = Buffer.from('NOT_A_ZIP_ARCHIVE_RANDOM_GARBAGE_PAYLOAD_123456');

      const res = await request(app)
        .post('/api/admin/knowledge-base/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', corruptedBuffer, 'corrupted.xlsx');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('missing ZIP header');
    });

    it('should reject corrupted binary with valid ZIP header but unreadable content with 400', async () => {
      // OpenXML magic bytes: 0x50, 0x4B, 0x03, 0x04 followed by corrupted payload
      const fakeZipBuffer = Buffer.concat([
        Buffer.from([0x50, 0x4b, 0x03, 0x04]),
        Buffer.from('corrupted_internal_deflate_stream_junk_bytes'),
      ]);

      const res = await request(app)
        .post('/api/admin/knowledge-base/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', fakeZipBuffer, 'corrupted_zip.xlsx');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Corrupted or invalid Excel file format');
    });

    it('should reject workbook missing required sheet (Answers) with 400 and preserve clean database state', async () => {
      const missingAnswersBuffer = createMissingSheetWorkbookBuffer('Answers');

      const res = await request(app)
        .post('/api/admin/knowledge-base/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', missingAnswersBuffer, 'missing_answers.xlsx');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Missing required sheet: Answers');

      // Zero documents inserted
      expect(await Level1Question.countDocuments()).toBe(0);
      expect(await ConsultationQuery.countDocuments()).toBe(0);
      expect(await Answer.countDocuments()).toBe(0);
    });

    it('should reject workbook missing required column header (Remedy in Answers) with 400', async () => {
      // Missing 'Remedy' column in Answers sheet (index 2)
      const missingColBuffer = createMissingColumnWorkbookBuffer('Answers', 2);

      const res = await request(app)
        .post('/api/admin/knowledge-base/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', missingColBuffer, 'missing_remedy.xlsx');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Sheet 'Answers' missing required header: 'Remedy'");

      // Zero documents inserted
      expect(await Level1Question.countDocuments()).toBe(0);
      expect(await ConsultationQuery.countDocuments()).toBe(0);
      expect(await Answer.countDocuments()).toBe(0);
    });

    it('should reject upload when unexpected field name is used with 400', async () => {
      const validBuffer = createValidMinimalWorkbookBuffer(1);

      const res = await request(app)
        .post('/api/admin/knowledge-base/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('document', validBuffer, 'valid.xlsx'); // 'document' instead of 'file'

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Unexpected upload field. File must be provided in field 'file'");
    });

    it('should reject multipart post when no file is attached with 400', async () => {
      const res = await request(app)
        .post('/api/admin/knowledge-base/import')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('No file uploaded');
    });

    it('should successfully ingest workbook with case-insensitive sheet names (LEVEL1, consultationqueries, ANSWERS)', async () => {
      const customBuffer = createCustomWorkbookBuffer({
        LEVEL1: [['Questions'], ['Case insensitive question test?']],
        consultationqueries: [['Questions', 'Diagnostic Question 1', 'Diagnostic Question 2', 'Diagnostic Question 3'], ['Case insensitive question test?', 'D1?', 'D2?', 'D3?']],
        ANSWERS: [['Question', 'Reason', 'Remedy'], ['Case insensitive question test?', 'Reason for case test', 'Remedy for case test']],
      });

      const res = await request(app)
        .post('/api/admin/knowledge-base/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', customBuffer, 'case_test.xlsx');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.counts.questions).toBe(1);
      expect(await Level1Question.countDocuments()).toBe(1);
    });
  });

  // ==========================================================================
  // Group 6: Strict Input Validation & Idempotency on CRUD Endpoints
  // ==========================================================================
  describe('Group 6: Input Validation & Idempotency on CRUD Endpoints', () => {
    it('should reject whitespace-only canonicalQuestionText with 400 on POST', async () => {
      const res = await request(app)
        .post('/api/admin/knowledge-base')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          canonicalQuestionText: '    \n\t   ',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('canonicalQuestionText is required');
    });

    it('should reject non-string types for canonicalQuestionText with 400 on POST', async () => {
      const invalidTypes = [12345, true, false, ['array of strings'], { text: 'object' }];
      for (const val of invalidTypes) {
        const res = await request(app)
          .post('/api/admin/knowledge-base')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            canonicalQuestionText: val,
          });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('canonicalQuestionText is required');
      }
    });

    it('should generate embedding server-side on POST, safely ignoring client-injected vector in REST body', async () => {
      const clientInjectedVector = new Array(1536).fill(0.999);

      const res = await request(app)
        .post('/api/admin/knowledge-base')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          canonicalQuestionText: 'Question to verify server-side embedding generation',
          embedding: clientInjectedVector,
        });

      expect(res.status).toBe(201);
      const createdDoc = await Level1Question.findById(res.body.item.id);
      expect(createdDoc!.embedding!.length).toBe(1536);

      // Server generated authentic unit norm embedding rather than trusting client's 0.999 array
      const norm = Math.sqrt(createdDoc!.embedding!.reduce((acc, v) => acc + v * v, 0));
      expect(Math.abs(norm - 1.0)).toBeLessThan(1e-4);
      expect(createdDoc!.embedding![0]).not.toBe(0.999);
    });

    it('should handle sequential duplicate DELETE requests idempotently (200 on first, 404 on second)', async () => {
      const createRes = await request(app)
        .post('/api/admin/knowledge-base')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ canonicalQuestionText: 'Delete Idempotency Test' });

      const id = createRes.body.item.id;

      // First DELETE: succeeds with 200
      const del1 = await request(app)
        .delete(`/api/admin/knowledge-base/${id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(del1.status).toBe(200);
      expect(del1.body.success).toBe(true);

      // Second DELETE: returns 404
      const del2 = await request(app)
        .delete(`/api/admin/knowledge-base/${id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(del2.status).toBe(404);
      expect(del2.body.success).toBe(false);
    });
  });
});

