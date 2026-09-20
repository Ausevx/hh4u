import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app';
import Level1Question from '../src/models/Level1Question';
import ConsultationQuery from '../src/models/ConsultationQuery';
import Answer from '../src/models/Answer';
import { generateAdminToken } from '../src/utils/jwt';
import { resetAIServices } from '../src/services/ai/aiContainer';

describe('Admin Knowledge Base REST APIs Test Suite', () => {
  let mongoServer: MongoMemoryServer;
  let adminToken: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    adminToken = generateAdminToken({
      adminId: 'admin_test_id',
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
  // 1. KPI Stats (GET /api/admin/stats)
  // ==========================================================================
  describe('GET /api/admin/stats', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/admin/stats');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Authentication token missing or invalid');
    });

    it('should return accurate live counts and active vector index in test mode', async () => {
      // Seed 2 active questions and 1 inactive question
      const q1 = await Level1Question.create({ canonicalQuestionText: 'Question 1', isActive: true });
      const q2 = await Level1Question.create({ canonicalQuestionText: 'Question 2', isActive: true });
      const q3 = await Level1Question.create({ canonicalQuestionText: 'Question 3', isActive: false });

      await ConsultationQuery.create({
        level1QuestionId: q1._id,
        diagnosticQuestions: [{ id: 'd1', questionText: 'Diag 1?' }],
      });
      await ConsultationQuery.create({
        level1QuestionId: q2._id,
        diagnosticQuestions: [{ id: 'd2', questionText: 'Diag 2?' }],
      });

      await Answer.create({ level1QuestionId: q1._id, answerText: 'Answer 1' });
      await Answer.create({ level1QuestionId: q2._id, answerText: 'Answer 2' });
      await Answer.create({ level1QuestionId: q3._id, answerText: 'Answer 3' });

      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.stats.totalQuestions).toBe(3);
      expect(res.body.stats.activeQuestions).toBe(2);
      expect(res.body.stats.inactiveQuestions).toBe(1);
      expect(res.body.stats.totalConsultations).toBe(2);
      expect(res.body.stats.totalAnswers).toBe(3);
      expect(res.body.stats.vectorIndexActive).toBe(true);
    });
  });

  // ==========================================================================
  // 2. Listing & Search (GET /api/admin/knowledge-base)
  // ==========================================================================
  describe('GET /api/admin/knowledge-base', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/admin/knowledge-base');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should paginate items properly with metadata', async () => {
      // Seed 5 questions
      for (let i = 1; i <= 5; i++) {
        await Level1Question.create({ canonicalQuestionText: `Allergy remedy question ${i}` });
      }

      const res = await request(app)
        .get('/api/admin/knowledge-base?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.total).toBe(5);
      expect(res.body.page).toBe(1);
      expect(res.body.totalPages).toBe(3);
      expect(res.body.items).toHaveLength(2);
    });

    it('should search across canonical question text and remedy text', async () => {
      const q1 = await Level1Question.create({
        canonicalQuestionText: 'What homeopathic medicine treats allergic rhinitis?',
        tags: ['respiratory'],
      });
      await Answer.create({
        level1QuestionId: q1._id,
        answerText: 'Allium Cepa is effective for watery eyes and sneezing',
        homeRemedyText: 'Allium Cepa 30C',
      });

      const q2 = await Level1Question.create({
        canonicalQuestionText: 'Remedies for joint arthritis pain',
        tags: ['orthopedic'],
      });
      await Answer.create({
        level1QuestionId: q2._id,
        answerText: 'Rhus Tox provides relief for stiffness',
        homeRemedyText: 'Rhus Tox 200C',
      });

      // Search by question keyword
      const res1 = await request(app)
        .get('/api/admin/knowledge-base?search=rhinitis')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res1.status).toBe(200);
      expect(res1.body.total).toBe(1);
      expect(res1.body.items[0].id).toBe(q1._id.toString());

      // Search by remedy keyword
      const res2 = await request(app)
        .get('/api/admin/knowledge-base?search=Rhus')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res2.status).toBe(200);
      expect(res2.body.total).toBe(1);
      expect(res2.body.items[0].id).toBe(q2._id.toString());
    });

    it('should safely handle search strings with regex special characters', async () => {
      await Level1Question.create({ canonicalQuestionText: 'Test [special] regex (query)?' });

      const res = await request(app)
        .get('/api/admin/knowledge-base?search=[special]')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
    });

    it('should clamp boundary pagination parameters', async () => {
      await Level1Question.create({ canonicalQuestionText: 'Bound test question' });

      // page 0 clamps to 1
      const resZero = await request(app)
        .get('/api/admin/knowledge-base?page=0&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resZero.body.page).toBe(1);

      // limit 0 defaults to 20
      const resLimit = await request(app)
        .get('/api/admin/knowledge-base?limit=0')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resLimit.status).toBe(200);

      // page beyond totalPages returns empty items
      const resOverflow = await request(app)
        .get('/api/admin/knowledge-base?page=999&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resOverflow.body.items).toEqual([]);
    });
  });

  // ==========================================================================
  // 3. Detail by ID (GET /api/admin/knowledge-base/:id)
  // ==========================================================================
  describe('GET /api/admin/knowledge-base/:id', () => {
    it('should reject unauthenticated request with 401', async () => {
      const validId = new mongoose.Types.ObjectId().toString();
      const res = await request(app).get(`/api/admin/knowledge-base/${validId}`);
      expect(res.status).toBe(401);
    });

    it('should return 400 when given an invalid ObjectId format', async () => {
      const res = await request(app)
        .get('/api/admin/knowledge-base/not-a-valid-object-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid.*id/i);
    });

    it('should return 404 when question is not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/admin/knowledge-base/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not found/i);
    });

    it('should return 200 with full composite item details when found', async () => {
      const q = await Level1Question.create({
        canonicalQuestionText: 'What helps with seasonal asthma in winter?',
        tags: ['respiratory', 'winter'],
      });
      await ConsultationQuery.create({
        level1QuestionId: q._id,
        diagnosticQuestions: [
          { id: 'dq1', questionText: 'Is wheezing worse at night?' },
          { id: 'dq2', questionText: 'Does cold air trigger the attack?' },
        ],
      });
      await Answer.create({
        level1QuestionId: q._id,
        answerText: 'Arsenicum Album 30C relieves midnight respiratory distress.',
        homeRemedyText: 'Arsenicum Album 30C',
        videoUrl: 'https://youtube.com/watch?v=sample123',
      });

      const res = await request(app)
        .get(`/api/admin/knowledge-base/${q._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.item.id).toBe(q._id.toString());
      expect(res.body.item.canonicalQuestionText).toBe('What helps with seasonal asthma in winter?');
      expect(res.body.item.tags).toEqual(['respiratory', 'winter']);
      expect(res.body.item.diagnosticQuestions).toHaveLength(2);
      expect(res.body.item.homeRemedyText).toBe('Arsenicum Album 30C');
      expect(res.body.item.videoUrl).toBe('https://youtube.com/watch?v=sample123');
    });
  });

  // ==========================================================================
  // 4. Create Entry (POST /api/admin/knowledge-base)
  // ==========================================================================
  describe('POST /api/admin/knowledge-base', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app)
        .post('/api/admin/knowledge-base')
        .send({ canonicalQuestionText: 'Test' });
      expect(res.status).toBe(401);
    });

    it('should reject creation when canonicalQuestionText is missing or empty with 400', async () => {
      const res1 = await request(app)
        .post('/api/admin/knowledge-base')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res1.status).toBe(400);
      expect(res1.body.success).toBe(false);
      expect(res1.body.message).toBe('canonicalQuestionText is required');

      const res2 = await request(app)
        .post('/api/admin/knowledge-base')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ canonicalQuestionText: '   ' });

      expect(res2.status).toBe(400);
      expect(res2.body.success).toBe(false);
    });

    it('should create question with 1536-dim embedding, consultation queries, and answer returning 201', async () => {
      const payload = {
        canonicalQuestionText: 'How to relieve acute indigestion after heavy meals?',
        tags: ['digestive', 'stomach'],
        diagnosticQuestions: [
          'Did the indigestion follow fatty food intake?',
          'Is there nausea with belching?',
        ],
        answerText: 'Nux Vomica 30C is the primary remedy for gastric heaviness.',
        homeRemedyText: 'Nux Vomica 30C and warm ginger tea.',
        videoUrl: 'https://youtube.com/watch?v=digestive1',
      };

      const res = await request(app)
        .post('/api/admin/knowledge-base')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.item.id).toBeDefined();
      expect(res.body.item.canonicalQuestionText).toBe(payload.canonicalQuestionText);
      expect(res.body.item.diagnosticQuestions).toHaveLength(2);
      expect(res.body.item.homeRemedyText).toBe(payload.homeRemedyText);

      // Verify DB records
      const qDoc = await Level1Question.findById(res.body.item.id);
      expect(qDoc).not.toBeNull();
      expect(qDoc?.embedding).toHaveLength(1536);
      expect(qDoc?.tags).toContain('digestive');

      const cqDoc = await ConsultationQuery.findOne({ level1QuestionId: qDoc?._id });
      expect(cqDoc).not.toBeNull();
      expect(cqDoc?.diagnosticQuestions).toHaveLength(2);

      const ansDoc = await Answer.findOne({ level1QuestionId: qDoc?._id });
      expect(ansDoc).not.toBeNull();
      expect(ansDoc?.videoUrl).toBe(payload.videoUrl);
    });

    it('should safely accept extremely long canonical questions (8000+ characters)', async () => {
      const longText = 'How to treat persistent skin rash? ' + 'A'.repeat(8100);
      const res = await request(app)
        .post('/api/admin/knowledge-base')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          canonicalQuestionText: longText,
          answerText: 'Standard remedy guidance.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.item.canonicalQuestionText.length).toBeGreaterThan(8000);
    });
  });

  // ==========================================================================
  // 5. Update Entry (PUT /api/admin/knowledge-base/:id)
  // ==========================================================================
  describe('PUT /api/admin/knowledge-base/:id', () => {
    it('should reject unauthenticated request with 401', async () => {
      const validId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .put(`/api/admin/knowledge-base/${validId}`)
        .send({ canonicalQuestionText: 'Update' });
      expect(res.status).toBe(401);
    });

    it('should return 404 for invalid ObjectId or non-existent question', async () => {
      const randomId = new mongoose.Types.ObjectId().toString();
      const res1 = await request(app)
        .put(`/api/admin/knowledge-base/${randomId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ canonicalQuestionText: 'Update non-existent' });
      expect(res1.status).toBe(404);

      const res2 = await request(app)
        .put('/api/admin/knowledge-base/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ canonicalQuestionText: 'Update invalid' });
      expect(res2.status).toBe(404);
    });

    it('should update question and regenerate embedding when question text changes', async () => {
      const q = await Level1Question.create({
        canonicalQuestionText: 'Initial original question text',
        embedding: new Array(1536).fill(0.1),
        tags: ['old_tag'],
        version: 1,
      });

      const res = await request(app)
        .put(`/api/admin/knowledge-base/${q._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          canonicalQuestionText: 'Revised updated question text for insomnia',
          tags: ['sleep', 'insomnia'],
          homeRemedyText: 'Coffea Cruda 30C',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.item.canonicalQuestionText).toBe('Revised updated question text for insomnia');

      // Verify DB persistence & version increment
      const updatedQ = await Level1Question.findById(q._id);
      expect(updatedQ?.canonicalQuestionText).toBe('Revised updated question text for insomnia');
      expect(updatedQ?.version).toBe(2);
      expect(updatedQ?.tags).toContain('sleep');
    });
  });

  // ==========================================================================
  // 6. Delete Entry (DELETE /api/admin/knowledge-base/:id)
  // ==========================================================================
  describe('DELETE /api/admin/knowledge-base/:id', () => {
    it('should reject unauthenticated request with 401', async () => {
      const validId = new mongoose.Types.ObjectId().toString();
      const res = await request(app).delete(`/api/admin/knowledge-base/${validId}`);
      expect(res.status).toBe(401);
    });

    it('should return 404 for invalid ObjectId or non-existent question', async () => {
      const randomId = new mongoose.Types.ObjectId().toString();
      const res1 = await request(app)
        .delete(`/api/admin/knowledge-base/${randomId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res1.status).toBe(404);

      const res2 = await request(app)
        .delete('/api/admin/knowledge-base/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res2.status).toBe(404);
    });

    it('should cascade delete Question, ConsultationQuery, and Answer', async () => {
      const q = await Level1Question.create({ canonicalQuestionText: 'To be cascade deleted' });
      await ConsultationQuery.create({
        level1QuestionId: q._id,
        diagnosticQuestions: [{ id: 'dq1', questionText: 'Diag to delete?' }],
      });
      await Answer.create({
        level1QuestionId: q._id,
        answerText: 'Answer to delete',
      });

      const res = await request(app)
        .delete(`/api/admin/knowledge-base/${q._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Knowledge base item deleted successfully');

      // Verify cascade deletion
      const checkQ = await Level1Question.findById(q._id);
      expect(checkQ).toBeNull();

      const checkCq = await ConsultationQuery.findOne({ level1QuestionId: q._id });
      expect(checkCq).toBeNull();

      const checkAns = await Answer.findOne({ level1QuestionId: q._id });
      expect(checkAns).toBeNull();
    });
  });
});
