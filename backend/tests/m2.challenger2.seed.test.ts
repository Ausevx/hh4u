import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Level1Question from '../src/models/Level1Question';
import ConsultationQuery from '../src/models/ConsultationQuery';
import Answer from '../src/models/Answer';
import Admin from '../src/models/Admin';
import { seedKnowledgeBase } from '../src/scripts/seedKnowledgeBase';
import { getAIServices, resetAIServices } from '../src/services/ai/aiContainer';
import { MockEmbeddingService } from '../src/services/ai/mock/mockEmbeddingService';

describe('Milestone M2 Challenger 2: Adversarial Seed Script & Data Layer Tests', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  }, 60000);

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

  // =========================================================================
  // 1. EMBEDDING DIMENSIONS, L2 NORMALIZATION & NUMERICAL STABILITY
  // =========================================================================
  describe('Category 1: Embedding Normalization, Dimensions & Vector Stability', () => {
    it('1.1: Every seeded Level 1 question must have exactly 1536 float elements with L2 norm = 1.0 ± 1e-6', async () => {
      const result = await seedKnowledgeBase({ skipDisconnect: true, log: false });
      expect(result.success).toBe(true);

      const allQuestions = await Level1Question.find({});
      expect(allQuestions).toHaveLength(184);

      for (let i = 0; i < allQuestions.length; i++) {
        const q = allQuestions[i];
        expect(q.embedding).toBeDefined();
        expect(Array.isArray(q.embedding)).toBe(true);
        expect(q.embedding!.length).toBe(1536);

        let sumSquares = 0;
        for (let j = 0; j < q.embedding!.length; j++) {
          const val = q.embedding![j];
          expect(typeof val).toBe('number');
          expect(Number.isFinite(val)).toBe(true);
          expect(Number.isNaN(val)).toBe(false);
          sumSquares += val * val;
        }

        const l2Norm = Math.sqrt(sumSquares);
        // Magnitude must equal 1.0 within numerical float tolerance
        expect(Math.abs(l2Norm - 1.0)).toBeLessThan(1e-6);
      }
    }, 60000);

    it('1.2: Embedding generator must be deterministic and produce unique embeddings across different questions', async () => {
      const embeddingService = getAIServices().embedding;

      const textA = 'Are antibiotics safe for children?';
      const textB = 'Can homeopathy treat severe fever in toddlers?';

      const embA1 = await embeddingService.generateEmbedding(textA);
      const embA2 = await embeddingService.generateEmbedding(textA);
      const embB = await embeddingService.generateEmbedding(textB);

      // Determinism
      expect(embA1).toEqual(embA2);

      // Distinctness
      let dotProduct = 0;
      for (let i = 0; i < 1536; i++) {
        dotProduct += embA1[i] * embB[i];
      }
      expect(dotProduct).toBeLessThan(0.9999);
    });

    it('1.3: Embedding service must handle adversarial text inputs (empty, whitespace, punctuation, huge string, unicode)', async () => {
      const mockService = new MockEmbeddingService();

      const adversarialInputs = [
        '',
        '   ',
        '???!!!...',
        'What is the for and to a an in of', // only stop words
        '🔥💡🧪💉🏥', // emojis only
        'होम्योपैथी दवा बच्चों के लिए सुरक्षित है?', // Hindi unicode
        'A'.repeat(10000), // huge payload
      ];

      for (const input of adversarialInputs) {
        const vec = await mockService.generateEmbedding(input);
        expect(vec).toHaveLength(1536);

        let sumSquares = 0;
        for (const v of vec) {
          expect(Number.isFinite(v)).toBe(true);
          sumSquares += v * v;
        }
        const norm = Math.sqrt(sumSquares);
        expect(Math.abs(norm - 1.0)).toBeLessThan(1e-6);
      }
    });
  });

  // =========================================================================
  // 2. IDEMPOTENCY & MULTI-RUN INVARIANCE
  // =========================================================================
  describe('Category 2: Seed Script Idempotency & Repeat Execution Invariants', () => {
    it('2.1: Repeated seed executions (3 consecutive runs) must produce zero duplicate documents and preserve exact ObjectIds', async () => {
      // Run 1: Initial Seed
      const run1 = await seedKnowledgeBase({ skipDisconnect: true, log: false });
      expect(run1.success).toBe(true);
      expect(await Level1Question.countDocuments()).toBe(184);
      expect(await ConsultationQuery.countDocuments()).toBe(184);
      expect(await Answer.countDocuments()).toBe(220);
      expect(await Admin.countDocuments()).toBe(1);

      // Capture all snapshot IDs
      const qDocs1 = await Level1Question.find({}).sort({ canonicalQuestionText: 1 });
      const cqDocs1 = await ConsultationQuery.find({}).sort({ level1QuestionId: 1 });
      const ansDocs1 = await Answer.find({}).sort({ questionText: 1, answerType: 1 });
      const adminDocs1 = await Admin.find({});

      const qMap1 = new Map(qDocs1.map((q) => [q.canonicalQuestionText, q._id.toString()]));
      const cqMap1 = new Map(cqDocs1.map((cq) => [cq.level1QuestionId.toString(), cq._id.toString()]));
      const ansMap1 = new Map(ansDocs1.map((a) => [`${a.questionText}__${a.answerType}`, a._id.toString()]));
      const adminId1 = adminDocs1[0]._id.toString();

      // Run 2: Re-seed
      const run2 = await seedKnowledgeBase({ skipDisconnect: true, log: false });
      expect(run2.success).toBe(true);
      expect(await Level1Question.countDocuments()).toBe(184);
      expect(await ConsultationQuery.countDocuments()).toBe(184);
      expect(await Answer.countDocuments()).toBe(220);
      expect(await Admin.countDocuments()).toBe(1);

      // Verify ObjectIds were NOT re-created (in-place upsert)
      const qDocs2 = await Level1Question.find({}).sort({ canonicalQuestionText: 1 });
      for (const q of qDocs2) {
        expect(q._id.toString()).toBe(qMap1.get(q.canonicalQuestionText));
      }

      const cqDocs2 = await ConsultationQuery.find({}).sort({ level1QuestionId: 1 });
      for (const cq of cqDocs2) {
        expect(cq._id.toString()).toBe(cqMap1.get(cq.level1QuestionId.toString()));
      }

      const ansDocs2 = await Answer.find({}).sort({ questionText: 1, answerType: 1 });
      for (const a of ansDocs2) {
        expect(a._id.toString()).toBe(ansMap1.get(`${a.questionText}__${a.answerType}`));
      }

      const adminDocs2 = await Admin.find({});
      expect(adminDocs2[0]._id.toString()).toBe(adminId1);

      // Run 3: Third re-seed
      const run3 = await seedKnowledgeBase({ skipDisconnect: true, log: false });
      expect(run3.success).toBe(true);
      expect(await Level1Question.countDocuments()).toBe(184);
      expect(await ConsultationQuery.countDocuments()).toBe(184);
      expect(await Answer.countDocuments()).toBe(220);
      expect(await Admin.countDocuments()).toBe(1);
    }, 90000);

    it('2.2: Re-seed must preserve existing consultation answerBranches and question metadata configured via setOnInsert', async () => {
      // Seed first time
      await seedKnowledgeBase({ skipDisconnect: true, log: false });

      // Modify a question with custom tags and modified version
      const targetQ = await Level1Question.findOne({ canonicalQuestionText: 'Are antibiotics safe for children?' });
      expect(targetQ).not.toBeNull();
      targetQ!.tags = ['custom-pediatric-tag', 'reviewed'];
      targetQ!.version = 5;
      await targetQ!.save();

      // Modify a consultation query with custom answerBranches
      const targetCq = await ConsultationQuery.findOne({ level1QuestionId: targetQ!._id });
      expect(targetCq).not.toBeNull();
      const mockAnswerId = new mongoose.Types.ObjectId();
      targetCq!.answerBranches = [
        {
          conditions: { diag_1: 'yes', diag_2: 'no' },
          resolvedAnswerId: mockAnswerId,
        },
      ];
      await targetCq!.save();

      // Re-run seed
      await seedKnowledgeBase({ skipDisconnect: true, log: false });

      // Verify custom tags and version were preserved ($setOnInsert behavior)
      const refreshedQ = await Level1Question.findById(targetQ!._id);
      expect(refreshedQ!.tags).toContain('custom-pediatric-tag');
      expect(refreshedQ!.tags).toContain('reviewed');
      expect(refreshedQ!.version).toBe(5);

      // Verify answerBranches were preserved ($setOnInsert behavior)
      const refreshedCq = await ConsultationQuery.findById(targetCq!._id);
      expect(refreshedCq!.answerBranches).toHaveLength(1);
      expect(refreshedCq!.answerBranches[0].resolvedAnswerId.toString()).toBe(mockAnswerId.toString());
      const condVal = (refreshedCq!.answerBranches[0].conditions as any) instanceof Map
        ? (refreshedCq!.answerBranches[0].conditions as any).get('diag_1')
        : (refreshedCq!.answerBranches[0].conditions as any)['diag_1'];
      expect(condVal).toBe('yes');
    }, 60000);
  });

  // =========================================================================
  // 3. BEHAVIOR WITH PARTIAL / EXISTING RECORDS
  // =========================================================================
  describe('Category 3: Database with Partial, Pre-Existing or External Records', () => {
    it('3.1: Pre-existing partial subset (10 questions, 10 consultations, 10 answers) correctly fills to 184/184/220 without duplicates', async () => {
      // Pre-insert 10 questions and their records
      const dummyQ1 = await Level1Question.create({
        canonicalQuestionText: 'Are antibiotics safe for children?',
        embedding: new Array(1536).fill(0.01),
        tags: ['pre-existing'],
        isActive: true,
      });

      const dummyCq1 = await ConsultationQuery.create({
        level1QuestionId: dummyQ1._id,
        diagnosticQuestions: [
          { id: 'diag_1', questionText: 'Pre-existing diagnostic question 1?' },
        ],
        answerBranches: [],
      });

      const dummyAns1 = await Answer.create({
        level1QuestionId: dummyQ1._id,
        questionText: 'Are antibiotics safe for children?',
        answerType: 'level1',
        answerText: 'Pre-existing answer text',
      });

      expect(await Level1Question.countDocuments()).toBe(1);
      expect(await ConsultationQuery.countDocuments()).toBe(1);
      expect(await Answer.countDocuments()).toBe(1);

      // Now run seed script without drop
      const seedRes = await seedKnowledgeBase({ skipDisconnect: true, log: false });
      expect(seedRes.success).toBe(true);

      // Exact count invariants must hold
      expect(await Level1Question.countDocuments()).toBe(184);
      expect(await ConsultationQuery.countDocuments()).toBe(184);
      expect(await Answer.countDocuments()).toBe(220);

      // The pre-existing question should retain its _id and be updated
      const updatedQ1 = await Level1Question.findById(dummyQ1._id);
      expect(updatedQ1).not.toBeNull();
      expect(updatedQ1!.embedding).toHaveLength(1536);

      // The pre-existing consultation query should retain its _id and be updated with 3 diagnostic questions
      const updatedCq1 = await ConsultationQuery.findById(dummyCq1._id);
      expect(updatedCq1).not.toBeNull();
      expect(updatedCq1!.diagnosticQuestions).toHaveLength(3);

      // The pre-existing answer should retain its _id and be updated with seed content
      const updatedAns1 = await Answer.findById(dummyAns1._id);
      expect(updatedAns1).not.toBeNull();
      expect(updatedAns1!.remedyText).toBeTruthy();
    }, 60000);

    it('3.2: Custom out-of-band question created by admin is preserved when dropExisting is false', async () => {
      // Pre-insert an unrelated custom question created via admin portal
      const customQ = await Level1Question.create({
        canonicalQuestionText: 'Custom Question: Can homeopathy treat space motion sickness?',
        tags: ['space', 'custom'],
        isActive: true,
        version: 1,
      });

      const customCq = await ConsultationQuery.create({
        level1QuestionId: customQ._id,
        diagnosticQuestions: [{ id: 'diag_1', questionText: 'Are you in zero gravity?' }],
        answerBranches: [],
      });

      const customAns = await Answer.create({
        level1QuestionId: customQ._id,
        questionText: customQ.canonicalQuestionText,
        answerType: 'level1',
        answerText: 'Cocculus indicus is often indicated for motion sickness.',
      });

      // Run seed
      const seedRes = await seedKnowledgeBase({ skipDisconnect: true, log: false });
      expect(seedRes.success).toBe(true);

      // Total questions should be 184 (from Excel) + 1 (custom) = 185
      expect(await Level1Question.countDocuments()).toBe(185);
      expect(await ConsultationQuery.countDocuments()).toBe(185);
      expect(await Answer.countDocuments()).toBe(221);

      // Verify the custom question is untouched
      const verifiedCustomQ = await Level1Question.findById(customQ._id);
      expect(verifiedCustomQ).not.toBeNull();
      expect(verifiedCustomQ!.canonicalQuestionText).toBe('Custom Question: Can homeopathy treat space motion sickness?');
    }, 60000);

    it('3.3: dropExisting: true cleanly wipes custom and existing records and resets to exact seed counts', async () => {
      // Pre-insert a custom question
      await Level1Question.create({
        canonicalQuestionText: 'Temporary Question To Be Wiped?',
        tags: ['temp'],
        isActive: true,
      });

      expect(await Level1Question.countDocuments()).toBe(1);

      // Run seed with dropExisting: true
      const seedRes = await seedKnowledgeBase({ dropExisting: true, skipDisconnect: true, log: false });
      expect(seedRes.success).toBe(true);

      // Verified exact baseline
      expect(await Level1Question.countDocuments()).toBe(184);
      expect(await ConsultationQuery.countDocuments()).toBe(184);
      expect(await Answer.countDocuments()).toBe(220);
      expect(await Admin.countDocuments()).toBe(1);

      // Temporary question must be gone
      expect(await Level1Question.findOne({ canonicalQuestionText: 'Temporary Question To Be Wiped?' })).toBeNull();
    }, 60000);
  });

  // =========================================================================
  // 4. DEFAULT ADMIN CREATION & IDEMPOTENCY
  // =========================================================================
  describe('Category 4: Default Admin Account Creation & Idempotency', () => {
    it('4.1: Seed creates default admin with admin role, password authProvider, and correct email', async () => {
      await seedKnowledgeBase({ skipDisconnect: true, log: false });

      const admin = await Admin.findOne({ email: 'admin@healinghands4u.com' });
      expect(admin).not.toBeNull();
      expect(admin!.role).toBe('admin');
      expect(admin!.authProvider).toBe('password');
      expect(admin!.passwordHash).toBe('Admin@123456');
      expect(await Admin.countDocuments({ email: 'admin@healinghands4u.com' })).toBe(1);
    }, 60000);

    it('4.2: Repeated seed runs do not produce duplicate admin accounts or unique constraint violations', async () => {
      // 1st seed
      await seedKnowledgeBase({ skipDisconnect: true, log: false });
      expect(await Admin.countDocuments()).toBe(1);

      // 2nd seed
      await seedKnowledgeBase({ skipDisconnect: true, log: false });
      expect(await Admin.countDocuments()).toBe(1);

      // 3rd seed with custom admin credentials
      await seedKnowledgeBase({
        adminEmail: 'admin@healinghands4u.com',
        adminPassword: 'UpdatedAdminPassword@2026',
        skipDisconnect: true,
        log: false,
      });
      expect(await Admin.countDocuments()).toBe(1);

      const updatedAdmin = await Admin.findOne({ email: 'admin@healinghands4u.com' });
      expect(updatedAdmin!.passwordHash).toBe('UpdatedAdminPassword@2026');
    }, 60000);

    it('4.3: Seed preserves co-existing admin accounts without dropping or corrupting them', async () => {
      // Pre-create a co-existing clinic admin
      const secondAdmin = await Admin.create({
        email: 'doctor.sharma@healinghands4u.com',
        passwordHash: 'DoctorSecure@999',
        authProvider: 'password',
        role: 'admin',
      });

      // Run seed without dropExisting
      await seedKnowledgeBase({ skipDisconnect: true, log: false });

      // Total admins must now be 2: default admin + second admin
      expect(await Admin.countDocuments()).toBe(2);

      const retrievedSecond = await Admin.findById(secondAdmin._id);
      expect(retrievedSecond).not.toBeNull();
      expect(retrievedSecond!.email).toBe('doctor.sharma@healinghands4u.com');
      expect(retrievedSecond!.passwordHash).toBe('DoctorSecure@999');

      const defaultAdmin = await Admin.findOne({ email: 'admin@healinghands4u.com' });
      expect(defaultAdmin).not.toBeNull();
    }, 60000);
  });

  // =========================================================================
  // 5. REFERENTIAL INTEGRITY & DATA COMPLETENESS
  // =========================================================================
  describe('Category 5: Referential Integrity & Data Completeness', () => {
    it('5.1: 100% of ConsultationQuery documents reference valid Level1Question IDs', async () => {
      await seedKnowledgeBase({ skipDisconnect: true, log: false });

      const allCqs = await ConsultationQuery.find({});
      expect(allCqs).toHaveLength(184);

      const validQuestionIds = new Set(
        (await Level1Question.find({}, { _id: 1 })).map((q) => q._id.toString())
      );

      for (const cq of allCqs) {
        expect(validQuestionIds.has(cq.level1QuestionId.toString())).toBe(true);
        expect(cq.diagnosticQuestions.length).toBe(3);
      }
    }, 60000);

    it('5.2: 100% of Level 1 Answers reference valid Level1Question IDs and have non-empty remedy/answer text', async () => {
      await seedKnowledgeBase({ skipDisconnect: true, log: false });

      const l1Answers = await Answer.find({ answerType: 'level1' });
      expect(l1Answers).toHaveLength(184);

      const validQuestionIds = new Set(
        (await Level1Question.find({}, { _id: 1 })).map((q) => q._id.toString())
      );

      for (const a of l1Answers) {
        expect(a.level1QuestionId).toBeDefined();
        expect(validQuestionIds.has(a.level1QuestionId!.toString())).toBe(true);
        expect(a.questionText.trim().length).toBeGreaterThan(0);
        expect(a.answerText.trim().length).toBeGreaterThan(0);
        expect(a.remedyText || a.reasonText).toBeTruthy();
      }
    }, 60000);

    it('5.3: Diagnostic Answers (36 total) have valid text content and YouTube links are properly formatted', async () => {
      await seedKnowledgeBase({ skipDisconnect: true, log: false });

      const diagAnswers = await Answer.find({ answerType: 'diagnostic' });
      expect(diagAnswers).toHaveLength(36);

      for (const da of diagAnswers) {
        expect(da.questionText.trim().length).toBeGreaterThan(0);
        expect(da.answerText.trim().length).toBeGreaterThan(0);
        if (da.videoUrl) {
          expect(da.videoUrl).toMatch(/^https:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\//);
          expect(da.videoUrl).not.toMatch(/[.,;:)\]>]$/); // no trailing punctuation
        }
      }
    }, 60000);
  });
});
