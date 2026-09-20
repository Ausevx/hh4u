import request from 'supertest';
import mongoose from 'mongoose';
import {
  getE2ETestApp,
  setupE2ETestEnvironment,
  parseExcelFile,
  parseExcelBuffer,
  generateAdminToken,
  generateUserToken,
} from './helpers/e2eHarness';
import {
  DUMMY_EXCEL_PATH,
  EXPECTED_SHEETS,
  EXPECTED_DATA_ROWS,
  EXPECTED_TOTAL_ROWS,
  inspectReferenceExcel,
} from './helpers/seedVerification';
import { createValidMinimalWorkbookBuffer } from './helpers/excelTestHelper';
import Level1Question from '../../src/models/Level1Question';
import ConsultationQuery from '../../src/models/ConsultationQuery';
import Answer from '../../src/models/Answer';
import Admin from '../../src/models/Admin';

describe('Tier 1: Feature Coverage — Opaque-Box E2E Test Suite', () => {
  setupE2ETestEnvironment();

  const app = getE2ETestApp();

  // =========================================================================
  // Group 1: Data Layer & Model Schema Validation (Tests 1 - 5)
  // =========================================================================
  describe('Data Layer & Schema Integrity (Tests 1 - 5)', () => {
    it('Test 1.1: should connect to MongoDB database and confirm connection state', async () => {
      expect(mongoose.connection.readyState).toBe(1); // 1 = connected
      const adminDb = mongoose.connection.db;
      expect(adminDb).toBeDefined();
    });

    it('Test 1.2: should enforce Level1Question schema validation and default fields', async () => {
      // Must require canonicalQuestionText
      const invalidQ = new Level1Question({});
      await expect(invalidQ.validate()).rejects.toThrow();

      // Valid question creates defaults
      const validQ = await Level1Question.create({
        canonicalQuestionText: 'Can homeopathy treat seasonal allergic rhinitis?',
        tags: ['allergy', 'respiratory'],
        embedding: new Array(1536).fill(0.01),
      });

      expect(validQ._id).toBeDefined();
      expect(validQ.canonicalQuestionText).toBe('Can homeopathy treat seasonal allergic rhinitis?');
      expect(validQ.tags).toContain('allergy');
      expect(validQ.isActive).toBe(true);
      expect(validQ.version).toBe(1);
      expect(validQ.embedding).toHaveLength(1536);
    });

    it('Test 1.3: should enforce ConsultationQuery schema with reference to Level1Question', async () => {
      const q = await Level1Question.create({
        canonicalQuestionText: 'What is the remedy for migraine headache?',
      });

      const cq = await ConsultationQuery.create({
        level1QuestionId: q._id,
        diagnosticQuestions: [
          { id: 'dq_1', questionText: 'Is the pain throbbing or dull?' },
          { id: 'dq_2', questionText: 'Does it get worse with light?' },
          { id: 'dq_3', questionText: 'Is there nausea or vomiting?' },
        ],
        answerBranches: [],
      });

      expect(cq.level1QuestionId.toString()).toBe(q._id.toString());
      expect(cq.diagnosticQuestions).toHaveLength(3);
      expect(cq.diagnosticQuestions[0].questionText).toBe('Is the pain throbbing or dull?');
    });

    it('Test 1.4: should enforce Answer schema with text, remedy, and videoUrl fields', async () => {
      const q = await Level1Question.create({
        canonicalQuestionText: 'What is the dosage for Arnica Montana?',
      });

      const ans = await Answer.create({
        level1QuestionId: q._id,
        answerText: 'Arnica Montana is indicated for blunt trauma and muscular soreness.',
        homeRemedyText: 'Dissolve 4 pellets under the tongue. Video: https://youtu.be/IUy9hg8iT3Q',
        videoUrl: 'https://youtu.be/IUy9hg8iT3Q',
      });

      expect(ans.level1QuestionId?.toString()).toBe(q._id.toString());
      expect(ans.answerText).toContain('Arnica Montana');
      expect(ans.videoUrl).toBe('https://youtu.be/IUy9hg8iT3Q');
    });

    it('Test 1.5: should enforce Admin schema with unique email and role admin', async () => {
      const admin = await Admin.create({
        email: 'testadmin@healinghands4u.com',
        passwordHash: 'secret_hash',
        authProvider: 'password',
        role: 'admin',
      });

      expect(admin.role).toBe('admin');
      expect(admin.authProvider).toBe('password');

      // Duplicate email must reject
      await expect(
        Admin.create({
          email: 'testadmin@healinghands4u.com',
          passwordHash: 'secret_hash_2',
          authProvider: 'password',
          role: 'admin',
        })
      ).rejects.toThrow();
    });
  });

  // =========================================================================
  // Group 2: Excel Parser & Reference Data Extraction (Tests 6 - 10)
  // =========================================================================
  describe('Excel Parser & Reference Data Extraction (Tests 6 - 10)', () => {
    it('Test 1.6: should parse database-dummy.xlsx and discover all 3 required sheets', async () => {
      const ref = inspectReferenceExcel();
      expect(ref.sheetNames).toEqual(expect.arrayContaining([...EXPECTED_SHEETS]));
    });

    it('Test 1.7: should extract exactly 184 Level 1 questions (185 total rows with header)', async () => {
      const parsed = await parseExcelFile(DUMMY_EXCEL_PATH);
      expect(parsed.level1Questions).toHaveLength(EXPECTED_DATA_ROWS.level1);
      expect(parsed.stats.totalRows.level1).toBe(EXPECTED_TOTAL_ROWS.level1);
      expect(parsed.stats.dataRows.level1).toBe(184);

      // Verify first and last canonical question
      expect(parsed.level1Questions[0].canonicalQuestionText).toBe('Are antibiotics safe for children?');
      expect(parsed.level1Questions[183].canonicalQuestionText).toBe("Why is my child's cough not going away?");
    });

    it('Test 1.8: should extract exactly 184 Consultation Queries with 3 diagnostic questions each', async () => {
      const parsed = await parseExcelFile(DUMMY_EXCEL_PATH);
      expect(parsed.consultationQueries).toHaveLength(EXPECTED_DATA_ROWS.consultation);
      expect(parsed.stats.totalRows.consultation).toBe(EXPECTED_TOTAL_ROWS.consultation);

      // Every single consultation query row must have 3 diagnostic questions
      for (const cq of parsed.consultationQueries) {
        expect(cq.diagnosticQuestions).toHaveLength(3);
        expect(cq.questionText).toBeTruthy();
      }
    });

    it('Test 1.9: should extract exactly 220 Answers (221 total rows with header) and isolate video URLs', async () => {
      const parsed = await parseExcelFile(DUMMY_EXCEL_PATH);
      expect(parsed.answers).toHaveLength(EXPECTED_DATA_ROWS.answers);
      expect(parsed.stats.totalRows.answers).toBe(EXPECTED_TOTAL_ROWS.answers);

      // Verify that YouTube URLs were extracted from answers
      const answersWithVideos = parsed.answers.filter((a) => !!a.videoUrl);
      expect(answersWithVideos.length).toBeGreaterThan(150); // Inspection found 195 rows with video links
      for (const a of answersWithVideos) {
        expect(a.videoUrl).toMatch(/https:\/\/youtu\.be\//);
      }
    });

    it('Test 1.10: should parse successfully from an in-memory Buffer', async () => {
      const fs = await import('fs');
      const fileBuffer = fs.readFileSync(DUMMY_EXCEL_PATH);
      const parsed = await parseExcelBuffer(fileBuffer);

      expect(parsed.level1Questions.length).toBe(184);
      expect(parsed.consultationQueries.length).toBe(184);
      expect(parsed.answers.length).toBe(220);
    });
  });

  // =========================================================================
  // Group 3: Admin Authentication & JWT Protection (Tests 11 - 15)
  // =========================================================================
  describe('Admin Authentication & JWT Protection (Tests 11 - 15)', () => {
    it('Test 1.11: POST /api/admin/auth/login should authenticate valid admin and return JWT with role admin', async () => {
      const res = await request(app)
        .post('/api/admin/auth/login')
        .send({
          email: 'admin@healinghands4u.com',
          password: 'Admin@123456',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.admin).toBeDefined();
      expect(res.body.admin.role).toBe('admin');
      expect(res.body.admin.email).toBe('admin@healinghands4u.com');
    });

    it('Test 1.12: POST /api/admin/auth/login should reject invalid password with 401', async () => {
      const res = await request(app)
        .post('/api/admin/auth/login')
        .send({
          email: 'admin@healinghands4u.com',
          password: 'IncorrectPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid/i);
    });

    it('Test 1.13: POST /api/admin/auth/login should reject non-existent email with 401', async () => {
      const res = await request(app)
        .post('/api/admin/auth/login')
        .send({
          email: 'nonexistent@nowhere.com',
          password: 'SomePassword123',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('Test 1.14: GET /api/admin/stats with valid Bearer token should succeed with 200', async () => {
      const token = generateAdminToken();

      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.stats).toBeDefined();
      expect(typeof res.body.stats.totalQuestions).toBe('number');
    });

    it('Test 1.15: Protected routes should verify that decoded token role is admin', async () => {
      const userToken = generateUserToken('normal_user_456');

      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // Group 4: Admin Knowledge Base REST APIs & Import (Tests 16 - 21)
  // =========================================================================
  describe('Admin Knowledge Base REST APIs & Bulk Import (Tests 16 - 21)', () => {
    it('Test 1.16: GET /api/admin/stats should report accurate live counts', async () => {
      const token = generateAdminToken();

      await Level1Question.create({ canonicalQuestionText: 'Question A' });
      await Level1Question.create({ canonicalQuestionText: 'Question B' });

      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.stats.totalQuestions).toBe(2);
      expect(res.body.stats.vectorIndexActive).toBe(true);
    });

    it('Test 1.17: GET /api/admin/knowledge-base should return paginated list of entries', async () => {
      const token = generateAdminToken();

      for (let i = 1; i <= 5; i++) {
        await Level1Question.create({ canonicalQuestionText: `Paginated question ${i}` });
      }

      const res = await request(app)
        .get('/api/admin/knowledge-base?page=1&limit=3')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.total).toBe(5);
      expect(res.body.page).toBe(1);
      expect(res.body.items).toHaveLength(3);
    });

    it('Test 1.18: POST /api/admin/knowledge-base should create question, consultation, and answer', async () => {
      const token = generateAdminToken();

      const newEntry = {
        canonicalQuestionText: 'How to manage chronic eczema with homeopathy?',
        tags: ['skin', 'chronic', 'eczema'],
        diagnosticQuestions: [
          'Is the eczema dry or oozing?',
          'Does it worsen with warmth or cold water?',
          'Are there associated allergies or asthma?',
        ],
        answerText: 'Graphites and Sulphur are primary remedies depending on lesion discharge.',
        homeRemedyText: 'Apply coconut oil and avoid harsh synthetic soaps.',
        videoUrl: 'https://youtu.be/Be9GyqxlvhM',
      };

      const res = await request(app)
        .post('/api/admin/knowledge-base')
        .set('Authorization', `Bearer ${token}`)
        .send(newEntry);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.item.id).toBeDefined();
      expect(res.body.item.canonicalQuestionText).toBe(newEntry.canonicalQuestionText);
      expect(res.body.item.diagnosticQuestions).toHaveLength(3);

      // Verify DB persistence
      const createdQ = await Level1Question.findById(res.body.item.id);
      expect(createdQ).not.toBeNull();
      const createdCq = await ConsultationQuery.findOne({ level1QuestionId: res.body.item.id });
      expect(createdCq).not.toBeNull();
      const createdAns = await Answer.findOne({ level1QuestionId: res.body.item.id });
      expect(createdAns).not.toBeNull();
    });

    it('Test 1.19: PUT /api/admin/knowledge-base/:id should update existing knowledge base entry', async () => {
      const token = generateAdminToken();

      const q = await Level1Question.create({
        canonicalQuestionText: 'Initial question before update',
        tags: ['initial'],
      });

      const res = await request(app)
        .put(`/api/admin/knowledge-base/${q._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          canonicalQuestionText: 'Updated question after revision',
          tags: ['revised', 'updated'],
          homeRemedyText: 'New remedy guidance',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.item.canonicalQuestionText).toBe('Updated question after revision');

      // Verify persistence
      const updatedQ = await Level1Question.findById(q._id);
      expect(updatedQ?.canonicalQuestionText).toBe('Updated question after revision');
      expect(updatedQ?.tags).toContain('revised');
    });

    it('Test 1.20: DELETE /api/admin/knowledge-base/:id should delete question and cascade to consultation & answer', async () => {
      const token = generateAdminToken();

      const q = await Level1Question.create({ canonicalQuestionText: 'To be deleted question' });
      await ConsultationQuery.create({
        level1QuestionId: q._id,
        diagnosticQuestions: [{ id: 'd1', questionText: 'Diag 1?' }],
        answerBranches: [],
      });
      await Answer.create({
        level1QuestionId: q._id,
        answerText: 'Answer to be deleted',
      });

      const res = await request(app)
        .delete(`/api/admin/knowledge-base/${q._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify Question deleted
      const checkQ = await Level1Question.findById(q._id);
      expect(checkQ).toBeNull();

      // Verify ConsultationQuery cascaded
      const checkCq = await ConsultationQuery.findOne({ level1QuestionId: q._id });
      expect(checkCq).toBeNull();

      // Verify Answer cascaded
      const checkAns = await Answer.findOne({ level1QuestionId: q._id });
      expect(checkAns).toBeNull();
    });

    it('Test 1.21: POST /api/admin/knowledge-base/import should upload and ingest valid Excel file', async () => {
      const token = generateAdminToken();
      const buffer = createValidMinimalWorkbookBuffer(3);

      const res = await request(app)
        .post('/api/admin/knowledge-base/import')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', buffer, 'test_knowledge_base.xlsx');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.counts.questions).toBe(3);
      expect(res.body.counts.consultations).toBe(3);
      expect(res.body.counts.answers).toBe(3);

      const qCount = await Level1Question.countDocuments();
      expect(qCount).toBe(3);
    });
  });
});
