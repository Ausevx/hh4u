import request from 'supertest';
import mongoose from 'mongoose';
import {
  getE2ETestApp,
  setupE2ETestEnvironment,
  generateAdminToken,
} from './helpers/e2eHarness';
import {
  createValidMinimalWorkbookBuffer,
  createMissingSheetWorkbookBuffer,
  createCorruptedBuffer,
} from './helpers/excelTestHelper';
import Level1Question from '../../src/models/Level1Question';
import ConsultationQuery from '../../src/models/ConsultationQuery';
import Answer from '../../src/models/Answer';
import { searchLevel1Questions } from '../../src/utils/vectorSimilarity';
import { getAIServices } from '../../src/services/ai/aiContainer';

describe('Tier 3: Pairwise Combinations & Cross-Feature Interactions', () => {
  setupE2ETestEnvironment();

  const app = getE2ETestApp();

  // =========================================================================
  // Combination 1: Excel Ingestion -> DB Storage -> Vector Search Retrieval
  // =========================================================================
  it('Combination 3.1: Excel upload -> database storage -> vector search retrieval', async () => {
    const token = generateAdminToken();
    const buffer = createValidMinimalWorkbookBuffer(3);

    // 1. Ingest via API
    const uploadRes = await request(app)
      .post('/api/admin/knowledge-base/import')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', buffer, 'seed.xlsx');

    expect(uploadRes.status).toBe(200);
    expect(uploadRes.body.success).toBe(true);

    // 2. Verify documents exist in database
    const questions = await Level1Question.find({});
    expect(questions.length).toBe(3);

    // 3. Execute Vector Search for "Sample Medical Question 1"
    const ai = getAIServices();
    const queryEmbedding = await ai.embedding.generateEmbedding('Sample Medical Question 1?');
    const searchResults = await searchLevel1Questions(queryEmbedding, 3);

    expect(searchResults.length).toBeGreaterThan(0);
    expect(searchResults[0].canonicalQuestionText).toBe('Sample Medical Question 1?');
    expect(searchResults[0].score).toBeGreaterThanOrEqual(0.9);
  });

  // =========================================================================
  // Combination 2: Admin Auth -> Complete KB Lifecycle -> Cascade Verification
  // =========================================================================
  it('Combination 3.2: Admin login -> create entry -> fetch -> update -> delete -> cascade verification', async () => {
    // 1. Admin login
    const loginRes = await request(app)
      .post('/api/admin/auth/login')
      .send({
        email: 'admin@healinghands4u.com',
        password: 'Admin@123456',
      });
    expect(loginRes.status).toBe(200);
    const token = loginRes.body.token;

    // 2. Create entry with diagnostic questions and remedy
    const createRes = await request(app)
      .post('/api/admin/knowledge-base')
      .set('Authorization', `Bearer ${token}`)
      .send({
        canonicalQuestionText: 'What is homeopathic treatment for allergic rhinitis?',
        tags: ['allergy', 'respiratory'],
        diagnosticQuestions: [
          'Is sneezing worse in morning?',
          'Is nasal discharge watery or thick?',
          'Is there itching in palate or throat?',
        ],
        answerText: 'Allium Cepa and Sabadilla are prime remedies for sneezing and watery coryza.',
        homeRemedyText: 'Steam inhalation with eucalyptus drops.',
        videoUrl: 'https://youtu.be/IUy9hg8iT3Q',
      });
    expect(createRes.status).toBe(201);
    const questionId = createRes.body.item.id;

    // 3. Fetch entry via search query
    const fetchRes = await request(app)
      .get('/api/admin/knowledge-base?search=rhinitis')
      .set('Authorization', `Bearer ${token}`);
    expect(fetchRes.status).toBe(200);
    expect(fetchRes.body.items).toHaveLength(1);
    expect(fetchRes.body.items[0].id.toString()).toBe(questionId.toString());

    // 4. Update entry
    const updateRes = await request(app)
      .put(`/api/admin/knowledge-base/${questionId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        canonicalQuestionText: 'What is homeopathic treatment for chronic allergic rhinitis?',
        homeRemedyText: 'Steam inhalation and warm saline nasal rinse.',
      });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.item.canonicalQuestionText).toContain('chronic allergic rhinitis');

    // 5. Delete entry and verify cascade
    const deleteRes = await request(app)
      .delete(`/api/admin/knowledge-base/${questionId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(deleteRes.status).toBe(200);

    // Verify all associated collections are cleared
    const checkQ = await Level1Question.findById(questionId);
    expect(checkQ).toBeNull();
    const checkCq = await ConsultationQuery.findOne({ level1QuestionId: questionId });
    expect(checkCq).toBeNull();
    const checkAns = await Answer.findOne({ level1QuestionId: questionId });
    expect(checkAns).toBeNull();
  });

  // =========================================================================
  // Combination 3: Malformed Excel Upload -> Database State Preservation
  // =========================================================================
  it('Combination 3.3: Malformed Excel upload rejected without corrupting existing database state', async () => {
    const token = generateAdminToken();

    // 1. Seed 2 initial valid questions
    await Level1Question.create({ canonicalQuestionText: 'Initial Question 1' });
    await Level1Question.create({ canonicalQuestionText: 'Initial Question 2' });
    const initialCount = await Level1Question.countDocuments();
    expect(initialCount).toBe(2);

    // 2. Attempt uploading an invalid workbook missing required sheet
    const invalidBuffer = createMissingSheetWorkbookBuffer('ConsultationQueries');
    const uploadRes = await request(app)
      .post('/api/admin/knowledge-base/import')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', invalidBuffer, 'bad_file.xlsx');

    expect(uploadRes.status).toBe(400);
    expect(uploadRes.body.success).toBe(false);

    // 3. Verify database state remains completely unchanged
    const afterCount = await Level1Question.countDocuments();
    expect(afterCount).toBe(2);

    const q1 = await Level1Question.findOne({ canonicalQuestionText: 'Initial Question 1' });
    expect(q1).not.toBeNull();
  });

  // =========================================================================
  // Combination 4: Unauthenticated Access to Import Rejection
  // =========================================================================
  it('Combination 3.4: Unauthenticated access to import rejected with 401 without file parsing', async () => {
    const corruptedBuffer = createCorruptedBuffer();

    // Attempt import with NO token
    const res = await request(app)
      .post('/api/admin/knowledge-base/import')
      .attach('file', corruptedBuffer, 'test.xlsx');

    // Must fail at auth middleware (401), not at file parser (400)
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Authentication token missing or invalid');
  });

  // =========================================================================
  // Combination 5: Concurrent Admin Operations
  // =========================================================================
  it('Combination 3.5: Concurrent operations by multiple admins maintain state consistency', async () => {
    const token = generateAdminToken();

    // Concurrent creation of 5 distinct questions
    const promises = [1, 2, 3, 4, 5].map((idx) =>
      request(app)
        .post('/api/admin/knowledge-base')
        .set('Authorization', `Bearer ${token}`)
        .send({
          canonicalQuestionText: `Concurrent Clinical Question ${idx}?`,
          tags: [`tag_${idx}`],
        })
    );

    const results = await Promise.all(promises);
    for (const r of results) {
      expect(r.status).toBe(201);
      expect(r.body.success).toBe(true);
    }

    const totalInDb = await Level1Question.countDocuments();
    expect(totalInDb).toBe(5);

    // Fetch stats and verify count
    const statsRes = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${token}`);
    expect(statsRes.status).toBe(200);
    expect(statsRes.body.stats.totalQuestions).toBe(5);
  });
});
