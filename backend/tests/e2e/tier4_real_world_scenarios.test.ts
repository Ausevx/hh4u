import request from 'supertest';
import fs from 'fs';
import {
  getE2ETestApp,
  setupE2ETestEnvironment,
  generateAdminToken,
} from './helpers/e2eHarness';
import {
  DUMMY_EXCEL_PATH,
  EXPECTED_DATA_ROWS,
} from './helpers/seedVerification';
import {
  createMissingSheetWorkbookBuffer,
  createValidMinimalWorkbookBuffer,
} from './helpers/excelTestHelper';
import Level1Question from '../../src/models/Level1Question';
import ConsultationQuery from '../../src/models/ConsultationQuery';
import Answer from '../../src/models/Answer';
import { searchLevel1Questions } from '../../src/utils/vectorSimilarity';
import { getAIServices } from '../../src/services/ai/aiContainer';

describe('Tier 4: Real-World Scenarios — Opaque-Box E2E Test Suite', () => {
  setupE2ETestEnvironment();

  const app = getE2ETestApp();

  // =========================================================================
  // Scenario 1: Clinic Onboarding & Bulk Knowledge Base Seeding
  // =========================================================================
  it('Scenario 4.1: Clinic onboarding - admin uploads database-dummy.xlsx and verifies all 184 questions and 220 remedies are queryable', async () => {
    // 1. Admin logs into portal
    const loginRes = await request(app)
      .post('/api/admin/auth/login')
      .send({
        email: 'admin@healinghands4u.com',
        password: 'Admin@123456',
      });
    expect(loginRes.status).toBe(200);
    const token = loginRes.body.token;

    // 2. Upload database-dummy.xlsx
    const fileBuffer = fs.readFileSync(DUMMY_EXCEL_PATH);
    const uploadRes = await request(app)
      .post('/api/admin/knowledge-base/import')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', fileBuffer, 'database-dummy.xlsx');

    expect(uploadRes.status).toBe(200);
    expect(uploadRes.body.success).toBe(true);
    expect(uploadRes.body.counts.questions).toBe(EXPECTED_DATA_ROWS.level1);
    expect(uploadRes.body.counts.consultations).toBe(EXPECTED_DATA_ROWS.consultation);
    expect(uploadRes.body.counts.answers).toBe(EXPECTED_DATA_ROWS.answers);

    // 3. Verify Admin KPI Stats reflect seeded dataset
    const statsRes = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(statsRes.status).toBe(200);
    expect(statsRes.body.stats.totalQuestions).toBe(184);
    expect(statsRes.body.stats.totalConsultations).toBe(184);
    expect(statsRes.body.stats.totalAnswers).toBe(220);

    // 4. Verify specific clinical entries exist
    const qFirst = await Level1Question.findOne({ canonicalQuestionText: 'Are antibiotics safe for children?' });
    expect(qFirst).not.toBeNull();
    const qLast = await Level1Question.findOne({ canonicalQuestionText: "Why is my child's cough not going away?" });
    expect(qLast).not.toBeNull();
  });

  // =========================================================================
  // Scenario 2: Patient Clinical Query Semantic Matching via Vector Search
  // =========================================================================
  it("Scenario 4.2: Patient clinical query - vector search matches closest question 'Why is my child\\'s cough not going away?'", async () => {
    const token = generateAdminToken();

    // 1. Ingest minimal dataset including cough question
    const buffer = createValidMinimalWorkbookBuffer(2);
    await request(app)
      .post('/api/admin/knowledge-base/import')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', buffer, 'seed.xlsx');

    // Also insert target cough question with realistic embedding
    const targetText = "Why is my child's cough not going away?";
    const ai = getAIServices();
    const targetEmbedding = await ai.embedding.generateEmbedding(targetText);

    const coughQ = await Level1Question.create({
      canonicalQuestionText: targetText,
      embedding: targetEmbedding,
      tags: ['respiratory', 'cough', 'pediatrics'],
      isActive: true,
    });

    await Answer.create({
      level1QuestionId: coughQ._id,
      answerText: 'Chronic pediatric cough requires thorough evaluation for post-nasal drip or asthma.',
      homeRemedyText: 'Warm water with honey (for children over 1 year) and ginger.',
      videoUrl: 'https://youtu.be/Be9GyqxlvhM',
    });

    // 2. Patient asks exact or semantic query
    const patientQueryEmbedding = await ai.embedding.generateEmbedding("child persistent dry cough won't stop");
    const matches = await searchLevel1Questions(patientQueryEmbedding, 3);

    expect(matches.length).toBeGreaterThan(0);
    expect(matches.some((m) => m.canonicalQuestionText === targetText)).toBe(true);

    // Verify corresponding remedy is retrievable
    const ans = await Answer.findOne({ level1QuestionId: coughQ._id });
    expect(ans?.homeRemedyText).toContain('Warm water with honey');
    expect(ans?.videoUrl).toBe('https://youtu.be/Be9GyqxlvhM');
  });

  // =========================================================================
  // Scenario 3: Admin Updates Remedy with Multimedia Link
  // =========================================================================
  it('Scenario 4.3: Admin updates remedy text with YouTube video link and verifies persistence', async () => {
    const token = generateAdminToken();

    // 1. Create clinical entry without video link
    const q = await Level1Question.create({
      canonicalQuestionText: 'What is the natural remedy for seasonal sinus headache?',
      tags: ['headache', 'sinus'],
    });

    await Answer.create({
      level1QuestionId: q._id,
      answerText: 'Belladonna and Kali Bichromicum relieve sinus congestion.',
      homeRemedyText: 'Inhale steam twice daily.',
    });

    // 2. Admin searches for entry
    const searchRes = await request(app)
      .get('/api/admin/knowledge-base?search=sinus')
      .set('Authorization', `Bearer ${token}`);
    expect(searchRes.status).toBe(200);
    expect(searchRes.body.items).toHaveLength(1);
    const item = searchRes.body.items[0];

    // 3. Admin updates entry with YouTube video URL
    const updateRes = await request(app)
      .put(`/api/admin/knowledge-base/${item.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        homeRemedyText: 'Inhale steam twice daily. Video instructions: https://youtu.be/IUy9hg8iT3Q',
        videoUrl: 'https://youtu.be/IUy9hg8iT3Q',
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.item.videoUrl).toBe('https://youtu.be/IUy9hg8iT3Q');

    // 4. Verify in DB
    const updatedAnswer = await Answer.findOne({ level1QuestionId: q._id });
    expect(updatedAnswer?.videoUrl).toBe('https://youtu.be/IUy9hg8iT3Q');
    expect(updatedAnswer?.homeRemedyText).toContain('https://youtu.be/IUy9hg8iT3Q');
  });

  // =========================================================================
  // Scenario 4: Admin Adds Diagnostic Query Tree and Cascades Deletion
  // =========================================================================
  it('Scenario 4.4: Admin adds new diagnostic tree and verifies cascade deletion upon removal', async () => {
    const token = generateAdminToken();

    // 1. Admin adds new clinical condition
    const postRes = await request(app)
      .post('/api/admin/knowledge-base')
      .set('Authorization', `Bearer ${token}`)
      .send({
        canonicalQuestionText: 'Can homeopathy help with recurrent acid reflux (GERD)?',
        tags: ['digestive', 'gerd', 'acidity'],
        diagnosticQuestions: [
          'Is burning worse after heavy meals?',
          'Is there regurgitation of sour liquid?',
          'Does it improve with cold or warm drinks?',
        ],
        answerText: 'Nux Vomica and Iris Versicolor are effective remedies.',
        homeRemedyText: 'Avoid late-night meals and sleep with head elevated.',
      });

    expect(postRes.status).toBe(201);
    const questionId = postRes.body.item.id;

    // Verify in DB
    const cq = await ConsultationQuery.findOne({ level1QuestionId: questionId });
    expect(cq).not.toBeNull();
    expect(cq?.diagnosticQuestions).toHaveLength(3);

    // 2. Admin decides to remove this condition
    const delRes = await request(app)
      .delete(`/api/admin/knowledge-base/${questionId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(delRes.status).toBe(200);

    // Verify full cascade deletion
    const checkQ = await Level1Question.findById(questionId);
    expect(checkQ).toBeNull();
    const checkCq = await ConsultationQuery.findOne({ level1QuestionId: questionId });
    expect(checkCq).toBeNull();
    const checkAns = await Answer.findOne({ level1QuestionId: questionId });
    expect(checkAns).toBeNull();
  });

  // =========================================================================
  // Scenario 5: Upload Error Recovery & State Preservation
  // =========================================================================
  it('Scenario 4.5: Staff uploads malformed file, receives clear 400 error, and succeeds on subsequent valid upload', async () => {
    const token = generateAdminToken();

    // 1. Staff mistakenly uploads spreadsheet missing 'Answers' sheet
    const malformedBuffer = createMissingSheetWorkbookBuffer('Answers');
    const failRes = await request(app)
      .post('/api/admin/knowledge-base/import')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', malformedBuffer, 'broken_upload.xlsx');

    expect(failRes.status).toBe(400);
    expect(failRes.body.success).toBe(false);
    expect(failRes.body.message).toMatch(/missing required sheet.*answers/i);

    // Verify DB is clean
    const countBefore = await Level1Question.countDocuments();
    expect(countBefore).toBe(0);

    // 2. Staff uploads valid minimal file
    const validBuffer = createValidMinimalWorkbookBuffer(4);
    const successRes = await request(app)
      .post('/api/admin/knowledge-base/import')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', validBuffer, 'valid_upload.xlsx');

    expect(successRes.status).toBe(200);
    expect(successRes.body.success).toBe(true);
    expect(successRes.body.counts.questions).toBe(4);

    const countAfter = await Level1Question.countDocuments();
    expect(countAfter).toBe(4);
  });
});
