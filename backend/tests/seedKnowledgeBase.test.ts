import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Level1Question from '../src/models/Level1Question';
import ConsultationQuery from '../src/models/ConsultationQuery';
import Answer from '../src/models/Answer';
import Admin from '../src/models/Admin';
import { seedKnowledgeBase, resolveExcelPath } from '../src/scripts/seedKnowledgeBase';
import { resetAIServices } from '../src/services/ai/aiContainer';

describe('Knowledge Base CLI Seed Script & Atlas Ingestion Suite', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  }, 30000);

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    resetAIServices();
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  it('Test 1: should resolve the seed file path for database-dummy.xlsx', () => {
    const excelPath = resolveExcelPath();
    expect(excelPath).toBeDefined();
    expect(excelPath.endsWith('database-dummy.xlsx')).toBe(true);
  });

  it('Test 2: should seed all 184 questions, 184 consultation queries, 220 answers, and default admin into database', async () => {
    const result = await seedKnowledgeBase({ skipDisconnect: true, log: false });

    expect(result.success).toBe(true);
    expect(result.counts.questions).toBe(184);
    expect(result.counts.consultations).toBe(184);
    expect(result.counts.answers).toBe(220);
    expect(result.counts.level1Answers).toBe(184);
    expect(result.counts.diagnosticAnswers).toBe(36);
    expect(result.counts.admin).toBe(1);

    // Verify sheet metrics matching Acceptance Criteria 1 & PRD 185/221 row counts
    expect(result.excelMetrics.level1Rows).toBe(185);
    expect(result.excelMetrics.consultationRows).toBe(185);
    expect(result.excelMetrics.answerRows).toBe(221);

    // Verify DB counts directly via Mongoose models
    const dbQuestions = await Level1Question.countDocuments();
    const dbConsultations = await ConsultationQuery.countDocuments();
    const dbAnswers = await Answer.countDocuments();
    const dbAdmin = await Admin.countDocuments({ email: 'admin@healinghands4u.com' });

    expect(dbQuestions).toBe(184);
    expect(dbConsultations).toBe(184);
    expect(dbAnswers).toBe(220);
    expect(dbAdmin).toBe(1);
  }, 30000);

  it('Test 3: should enforce schema invariants and referential integrity across seeded documents', async () => {
    await seedKnowledgeBase({ skipDisconnect: true, log: false });

    // Verify Level 1 Questions
    const firstQ = await Level1Question.findOne({ canonicalQuestionText: 'Are antibiotics safe for children?' });
    expect(firstQ).not.toBeNull();
    expect(firstQ!.embedding).toHaveLength(1536);
    expect(firstQ!.isActive).toBe(true);
    expect(firstQ!.tags).toContain('homeopathy');

    const lastQ = await Level1Question.findOne({ canonicalQuestionText: "Why is my child's cough not going away?" });
    expect(lastQ).not.toBeNull();
    expect(lastQ!.embedding).toHaveLength(1536);

    // Verify Consultation Queries
    const firstCq = await ConsultationQuery.findOne({ level1QuestionId: firstQ!._id });
    expect(firstCq).not.toBeNull();
    expect(firstCq!.diagnosticQuestions).toHaveLength(3);
    for (const dq of firstCq!.diagnosticQuestions) {
      expect(dq.id).toMatch(/^diag_\d+$/);
      expect(dq.questionText.length).toBeGreaterThan(10);
      expect(dq.questionText.endsWith('?')).toBe(true);
    }

    // Verify Level 1 Answer
    const firstAns = await Answer.findOne({ level1QuestionId: firstQ!._id, answerType: 'level1' });
    expect(firstAns).not.toBeNull();
    expect(firstAns!.questionText).toBe('Are antibiotics safe for children?');
    expect(firstAns!.answerText).toBeTruthy();
    expect(firstAns!.remedyText).toBeTruthy();
    expect(firstAns!.homeRemedyText).toBeTruthy();

    // Verify Diagnostic Question Answers (36 total)
    const diagAnswers = await Answer.find({ answerType: 'diagnostic' });
    expect(diagAnswers).toHaveLength(36);
    for (const da of diagAnswers) {
      expect(da.questionText).toBeTruthy();
      expect(da.answerType).toBe('diagnostic');
      expect(da.answerText).toBeTruthy();
    }

    // Verify YouTube Links
    const answersWithVideo = await Answer.find({ videoUrl: { $exists: true, $ne: '' } });
    expect(answersWithVideo.length).toBeGreaterThan(150);
    for (const a of answersWithVideo) {
      expect(a.videoUrl).toMatch(/^https:\/\/youtu\.be\//);
    }

    // Verify Default Admin
    const admin = await Admin.findOne({ email: 'admin@healinghands4u.com' });
    expect(admin).not.toBeNull();
    expect(admin!.role).toBe('admin');
    expect(admin!.authProvider).toBe('password');
  }, 30000);

  it('Test 4: should be idempotent on repeated runs without creating duplicate records', async () => {
    // First run
    await seedKnowledgeBase({ skipDisconnect: true, log: false });
    expect(await Level1Question.countDocuments()).toBe(184);
    expect(await ConsultationQuery.countDocuments()).toBe(184);
    expect(await Answer.countDocuments()).toBe(220);
    expect(await Admin.countDocuments()).toBe(1);

    // Second run (re-seeding)
    const secondRun = await seedKnowledgeBase({ skipDisconnect: true, log: false });
    expect(secondRun.success).toBe(true);

    // Confirm no duplicates were created
    expect(await Level1Question.countDocuments()).toBe(184);
    expect(await ConsultationQuery.countDocuments()).toBe(184);
    expect(await Answer.countDocuments()).toBe(220);
    expect(await Admin.countDocuments()).toBe(1);
  }, 30000);

  it('Test 5: should support dropExisting flag to cleanly wipe and re-seed collections', async () => {
    // Initial seed
    await seedKnowledgeBase({ skipDisconnect: true, log: false });
    expect(await Level1Question.countDocuments()).toBe(184);

    // Re-seed with dropExisting: true
    const cleanResult = await seedKnowledgeBase({ dropExisting: true, skipDisconnect: true, log: false });
    expect(cleanResult.success).toBe(true);
    expect(await Level1Question.countDocuments()).toBe(184);
    expect(await ConsultationQuery.countDocuments()).toBe(184);
    expect(await Answer.countDocuments()).toBe(220);
    expect(await Admin.countDocuments()).toBe(1);
  }, 30000);

  it('Test 6: should fail with clear error when a non-existent Excel path is provided', async () => {
    await expect(
      seedKnowledgeBase({ excelPath: '/non/existent/path/fake.xlsx', skipDisconnect: true, log: false })
    ).rejects.toThrow();
  });
});
