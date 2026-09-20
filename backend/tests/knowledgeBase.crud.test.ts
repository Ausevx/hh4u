import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Level1Question from '../src/models/Level1Question';
import ConsultationQuery from '../src/models/ConsultationQuery';
import Answer from '../src/models/Answer';
import ChatbotSession from '../src/models/ChatbotSession';
import adminKnowledgeBaseService, {
  AdminKnowledgeBaseService,
} from '../src/services/adminKnowledgeBaseService';
import { resetAIServices, getAIServices } from '../src/services/ai/aiContainer';

describe('Knowledge Base Collections — CRUD Operations & Referential Integrity Suite', () => {
  let mongoServer: MongoMemoryServer;
  let service: AdminKnowledgeBaseService;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    service = adminKnowledgeBaseService;
  });

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

  // ==========================================================================
  // 1. Level 1 Question CRUD
  // ==========================================================================
  describe('Level 1 Question CRUD Operations', () => {
    it('should create a question with auto-generated 1536-dim embedding', async () => {
      const q = await service.createLevel1Question({
        canonicalQuestionText: 'What remedies help with acute migraine headache?',
        tags: ['migraine', 'headache'],
      });

      expect(q._id).toBeDefined();
      expect(q.canonicalQuestionText).toBe('What remedies help with acute migraine headache?');
      expect(q.tags).toEqual(['migraine', 'headache']);
      expect(q.isActive).toBe(true);
      expect(q.version).toBe(1);
      expect(q.embedding).toBeDefined();
      expect(q.embedding).toHaveLength(1536);
    });

    it('should reject creation when canonicalQuestionText is missing or whitespace', async () => {
      await expect(
        service.createLevel1Question({ canonicalQuestionText: '   ' })
      ).rejects.toThrow('canonicalQuestionText is required');
    });

    it('should read a question by ID', async () => {
      const created = await service.createLevel1Question({
        canonicalQuestionText: 'Can homeopathy treat seasonal allergic rhinitis?',
        tags: ['allergy'],
      });

      const retrieved = await service.getLevel1QuestionById(created._id.toString());
      expect(retrieved).not.toBeNull();
      expect(retrieved?.canonicalQuestionText).toBe(created.canonicalQuestionText);
    });

    it('should return null for non-existent or invalid question ID', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      expect(await service.getLevel1QuestionById(nonExistentId)).toBeNull();
      expect(await service.getLevel1QuestionById('invalid-id-string')).toBeNull();
    });

    it('should update question fields and tags', async () => {
      const created = await service.createLevel1Question({
        canonicalQuestionText: 'Initial question text',
        tags: ['tag1'],
      });

      const updated = await service.updateLevel1Question(created._id.toString(), {
        canonicalQuestionText: 'Updated question text',
        tags: ['tag1', 'tag2'],
        isActive: false,
      });

      expect(updated?.canonicalQuestionText).toBe('Updated question text');
      expect(updated?.tags).toEqual(['tag1', 'tag2']);
      expect(updated?.isActive).toBe(false);
    });

    it('should delete an individual question', async () => {
      const created = await service.createLevel1Question({
        canonicalQuestionText: 'Question to be deleted',
      });

      const deleted = await service.deleteLevel1Question(created._id.toString());
      expect(deleted).toBe(true);

      const check = await Level1Question.findById(created._id);
      expect(check).toBeNull();
    });
  });

  // ==========================================================================
  // 2. Consultation Query CRUD
  // ==========================================================================
  describe('Consultation Query CRUD Operations', () => {
    it('should create consultation query linked to a Level 1 Question', async () => {
      const q = await service.createLevel1Question({
        canonicalQuestionText: 'Diagnostic query root question',
      });

      const consult = await service.createConsultationQuery({
        level1QuestionId: q._id as mongoose.Types.ObjectId,
        diagnosticQuestions: [
          { id: 'dq1', questionText: 'Is the pain throbbing or dull?' },
          { id: 'dq2', questionText: 'Does motion aggravate the pain?' },
        ],
      });

      expect(consult._id).toBeDefined();
      expect(consult.level1QuestionId.toString()).toBe(q._id.toString());
      expect(consult.diagnosticQuestions).toHaveLength(2);
    });

    it('should retrieve consultation query by level1QuestionId', async () => {
      const q = await service.createLevel1Question({
        canonicalQuestionText: 'Root question for lookup',
      });
      await service.createConsultationQuery({
        level1QuestionId: q._id as mongoose.Types.ObjectId,
        diagnosticQuestions: [{ id: 'dq1', questionText: 'Sample diagnostic Q?' }],
      });

      const found = await service.getConsultationQueryByQuestionId(q._id.toString());
      expect(found).not.toBeNull();
      expect(found?.diagnosticQuestions[0].questionText).toBe('Sample diagnostic Q?');
    });

    it('should update diagnostic questions and answer branches', async () => {
      const q = await service.createLevel1Question({ canonicalQuestionText: 'Branch root' });
      const consult = await service.createConsultationQuery({
        level1QuestionId: q._id as mongoose.Types.ObjectId,
        diagnosticQuestions: [{ id: 'dq1', questionText: 'Initial DQ' }],
      });

      const dummyAnswerId = new mongoose.Types.ObjectId();
      const updated = await service.updateConsultationQuery(consult._id.toString(), {
        diagnosticQuestions: [
          { id: 'dq1', questionText: 'Modified DQ' },
          { id: 'dq2', questionText: 'Added DQ 2' },
        ],
        answerBranches: [
          {
            conditions: { dq1: 'yes', dq2: 'no' } as any,
            resolvedAnswerId: dummyAnswerId,
          },
        ],
      });

      expect(updated?.diagnosticQuestions).toHaveLength(2);
      expect(updated?.diagnosticQuestions[0].questionText).toBe('Modified DQ');
      expect(updated?.answerBranches).toHaveLength(1);
    });

    it('should delete a consultation query', async () => {
      const q = await service.createLevel1Question({ canonicalQuestionText: 'Root' });
      const consult = await service.createConsultationQuery({
        level1QuestionId: q._id as mongoose.Types.ObjectId,
        diagnosticQuestions: [{ id: 'dq1', questionText: 'Delete me' }],
      });

      const deleted = await service.deleteConsultationQuery(consult._id.toString());
      expect(deleted).toBe(true);
      expect(await ConsultationQuery.findById(consult._id)).toBeNull();
    });
  });

  // ==========================================================================
  // 3. Answer CRUD (Level 1 & Diagnostic)
  // ==========================================================================
  describe('Answer CRUD Operations', () => {
    it('should create Level 1 Answer with remedies and media link', async () => {
      const q = await service.createLevel1Question({ canonicalQuestionText: 'Hypertension remedies?' });

      const ans = await service.createAnswer({
        level1QuestionId: q._id as mongoose.Types.ObjectId,
        answerText: 'Rauwolfia Serpentina Q is commonly indicated.',
        homeRemedyText: 'Drink garlic water and practice pranayama daily.',
        videoUrl: 'https://youtu.be/sample123',
      });

      expect(ans._id).toBeDefined();
      expect(ans.level1QuestionId?.toString()).toBe(q._id.toString());
      expect(ans.homeRemedyText).toContain('garlic water');
      expect(ans.videoUrl).toBe('https://youtu.be/sample123');
    });

    it('should retrieve answers by level1QuestionId', async () => {
      const q = await service.createLevel1Question({ canonicalQuestionText: 'Multi-answer test' });

      await service.createAnswer({
        level1QuestionId: q._id as mongoose.Types.ObjectId,
        answerText: 'Remedy A',
      });
      await service.createAnswer({
        level1QuestionId: q._id as mongoose.Types.ObjectId,
        answerText: 'Remedy B',
      });

      const answers = await service.getAnswersByQuestionId(q._id.toString());
      expect(answers).toHaveLength(2);
    });

    it('should update answer remedies and video URL', async () => {
      const q = await service.createLevel1Question({ canonicalQuestionText: 'Update ans test' });
      const ans = await service.createAnswer({
        level1QuestionId: q._id as mongoose.Types.ObjectId,
        answerText: 'Initial text',
      });

      const updated = await service.updateAnswer(ans._id.toString(), {
        answerText: 'Revised text',
        homeRemedyText: 'New herbal tea remedy',
        videoUrl: 'https://youtu.be/revised',
      });

      expect(updated?.answerText).toBe('Revised text');
      expect(updated?.homeRemedyText).toBe('New herbal tea remedy');
      expect(updated?.videoUrl).toBe('https://youtu.be/revised');
    });

    it('should delete an individual answer', async () => {
      const q = await service.createLevel1Question({ canonicalQuestionText: 'Del ans' });
      const ans = await service.createAnswer({
        level1QuestionId: q._id as mongoose.Types.ObjectId,
        answerText: 'To be deleted',
      });

      const deleted = await service.deleteAnswer(ans._id.toString());
      expect(deleted).toBe(true);
      expect(await Answer.findById(ans._id)).toBeNull();
    });
  });

  // ==========================================================================
  // 4. Composite Knowledge Base Item CRUD & Cascade Deletion
  // ==========================================================================
  describe('Composite Knowledge Base Item CRUD & Cascade Deletion', () => {
    it('should atomically create complete Knowledge Base item (Question + Consultation + Answer)', async () => {
      const item = await service.createKnowledgeBaseItem({
        canonicalQuestionText: 'What is the homeopathic protocol for acute asthma attacks?',
        tags: ['asthma', 'respiratory', 'acute'],
        diagnosticQuestions: [
          'Is breathing difficult especially while lying flat on back?',
          'Is there a dry spasmodic cough with rattling in chest?',
        ],
        answerText: 'Aconite 30C or Arsenicum Album 30C during acute bouts.',
        homeRemedyText: 'Inhale warm steam with saline drops; sit upright in open air.',
        videoUrl: 'https://youtu.be/asthma_protocol',
      });

      expect(item.id).toBeDefined();
      expect(item.canonicalQuestionText).toContain('acute asthma attacks');
      expect(item.tags).toEqual(['asthma', 'respiratory', 'acute']);
      expect(item.embedding).toHaveLength(1536);
      expect(item.consultationQuery).toBeDefined();
      expect(item.consultationQuery?.diagnosticQuestions).toHaveLength(2);
      expect(item.answer).toBeDefined();
      expect(item.answer?.answerText).toContain('Aconite 30C');
      expect(item.homeRemedyText).toContain('warm steam');
      expect(item.videoUrl).toBe('https://youtu.be/asthma_protocol');

      // Verify records in DB collections
      expect(await Level1Question.countDocuments()).toBe(1);
      expect(await ConsultationQuery.countDocuments()).toBe(1);
      expect(await Answer.countDocuments()).toBe(1);
    });

    it('should retrieve composite KnowledgeBaseItem by ID', async () => {
      const created = await service.createKnowledgeBaseItem({
        canonicalQuestionText: 'Remedies for pediatric colic',
        tags: ['colic', 'pediatric'],
        diagnosticQuestions: ['Does the infant double up and scream with relief from firm abdominal pressure?'],
        answerText: 'Colocynthis 30C or Chamomilla 30C.',
      });

      const retrieved = await service.getKnowledgeBaseItemById(created.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.canonicalQuestionText).toBe('Remedies for pediatric colic');
      expect(retrieved?.diagnosticQuestions).toEqual([
        'Does the infant double up and scream with relief from firm abdominal pressure?',
      ]);
    });

    it('should update question, diagnostic questions, and answer atomically', async () => {
      const created = await service.createKnowledgeBaseItem({
        canonicalQuestionText: 'Initial eczema treatment query',
        tags: ['skin'],
        diagnosticQuestions: ['Is there intense itching worse at night?'],
        answerText: 'Graphites 30C.',
        homeRemedyText: 'Coconut oil application.',
      });

      const updated = await service.updateKnowledgeBaseItem(created.id, {
        canonicalQuestionText: 'Comprehensive homeopathic treatment for chronic eczema',
        tags: ['skin', 'chronic', 'dermatology'],
        diagnosticQuestions: [
          'Is there intense itching worse at night?',
          'Is the lesion dry and scaly or weeping golden fluid?',
        ],
        answerText: 'Sulphur 200C followed by Graphites 30C for weeping eczema.',
        homeRemedyText: 'Cold-pressed coconut oil mixed with neem extract.',
      });

      expect(updated?.canonicalQuestionText).toBe('Comprehensive homeopathic treatment for chronic eczema');
      expect(updated?.version).toBe(2);
      expect(updated?.tags).toEqual(['skin', 'chronic', 'dermatology']);
      expect(updated?.consultationQuery?.diagnosticQuestions).toHaveLength(2);
      expect(updated?.answer?.answerText).toContain('Sulphur 200C');
      expect(updated?.homeRemedyText).toContain('neem extract');
    });

    it('CASCADE DELETE: deleting a question must delete associated consultation query and answers', async () => {
      const q1 = await service.createKnowledgeBaseItem({
        canonicalQuestionText: 'Target for cascade deletion',
        diagnosticQuestions: ['Diag Q1', 'Diag Q2'],
        answerText: 'Target remedy',
      });

      // Also create an unrelated second question to ensure strict isolation
      const q2 = await service.createKnowledgeBaseItem({
        canonicalQuestionText: 'Unrelated second question',
        diagnosticQuestions: ['Other Diag Q'],
        answerText: 'Other remedy',
      });

      expect(await Level1Question.countDocuments()).toBe(2);
      expect(await ConsultationQuery.countDocuments()).toBe(2);
      expect(await Answer.countDocuments()).toBe(2);

      // Perform cascade delete on q1
      const delResult = await service.deleteKnowledgeBaseItem(q1.id);
      expect(delResult).not.toBeNull();
      expect(delResult?.success).toBe(true);
      expect(delResult?.deletedCount.questions).toBe(1);
      expect(delResult?.deletedCount.consultations).toBe(1);
      expect(delResult?.deletedCount.answers).toBe(1);

      // Verify q1 is gone
      expect(await Level1Question.findById(q1.id)).toBeNull();
      expect(await ConsultationQuery.findOne({ level1QuestionId: q1.id })).toBeNull();
      expect(await Answer.find({ level1QuestionId: q1.id })).toHaveLength(0);

      // Verify q2 remains completely intact (referential isolation)
      expect(await Level1Question.findById(q2.id)).not.toBeNull();
      expect(await ConsultationQuery.findOne({ level1QuestionId: q2.id })).not.toBeNull();
      expect(await Answer.findOne({ level1QuestionId: q2.id })).not.toBeNull();
      expect(await Level1Question.countDocuments()).toBe(1);
      expect(await ConsultationQuery.countDocuments()).toBe(1);
      expect(await Answer.countDocuments()).toBe(1);
    });

    it('CASCADE INTEGRITY: deleting question preserves historical ChatbotSession records', async () => {
      const q = await service.createKnowledgeBaseItem({
        canonicalQuestionText: 'Session audit preservation test',
        answerText: 'Preserved remedy',
      });

      // Create a mock patient session referencing this question
      const session = await ChatbotSession.create({
        userId: new mongoose.Types.ObjectId(),
        originalQueryText: 'I have severe pain',
        originalLanguage: 'en',
        translatedQueryText: 'I have severe pain',
        inputMode: 'text',
        intent: 'direct_answer',
        matchedLevel1QuestionId: new mongoose.Types.ObjectId(q.id),
        finalAnswerId: q.answer ? new mongoose.Types.ObjectId(q.answer.id) : undefined,
        matchConfident: true,
        matchCandidates: [],
      });

      // Cascade delete the knowledge base question
      await service.deleteKnowledgeBaseItem(q.id);

      // ChatbotSession MUST NOT be deleted (medical audit trail integrity)
      const auditCheck = await ChatbotSession.findById(session._id);
      expect(auditCheck).not.toBeNull();
      expect(auditCheck?.originalQueryText).toBe('I have severe pain');
    });
  });

  // ==========================================================================
  // 5. Search, Filtering, Pagination & KPI Stats
  // ==========================================================================
  describe('Search, Filtering, Pagination & KPI Stats', () => {
    beforeEach(async () => {
      await service.createKnowledgeBaseItem({
        canonicalQuestionText: 'Tension headache relief guidelines',
        tags: ['headache', 'tension'],
        isActive: true,
        answerText: 'Belladonna 30C',
        homeRemedyText: 'Rest in dark room',
      });
      await service.createKnowledgeBaseItem({
        canonicalQuestionText: 'Acute migraine attack protocol',
        tags: ['headache', 'migraine'],
        isActive: true,
        answerText: 'Glonoinum 200C',
        homeRemedyText: 'Cold compress on forehead',
      });
      await service.createKnowledgeBaseItem({
        canonicalQuestionText: 'Seasonal allergic rhinitis management',
        tags: ['allergy', 'rhinitis'],
        isActive: false, // Inactive
        answerText: 'Allium Cepa 30C',
        homeRemedyText: 'Saline nasal spray',
      });
      await service.createKnowledgeBaseItem({
        canonicalQuestionText: 'Hypertension management and lifestyle',
        tags: ['cardio', 'lifestyle'],
        isActive: true,
        answerText: 'Rauwolfia Q',
        homeRemedyText: 'Garlic juice in warm water',
      });
    });

    it('should search by text substring across questions and answers', async () => {
      const res = await service.listKnowledgeBaseItems({ search: 'migraine' });
      expect(res.total).toBe(1);
      expect(res.items[0].canonicalQuestionText).toContain('migraine');

      // Search by remedy text
      const remedyRes = await service.listKnowledgeBaseItems({ search: 'dark room' });
      expect(remedyRes.total).toBe(1);
      expect(remedyRes.items[0].canonicalQuestionText).toContain('Tension headache');
    });

    it('should filter by tag', async () => {
      const res = await service.listKnowledgeBaseItems({ tag: 'headache' });
      expect(res.total).toBe(2);
    });

    it('should filter by active status', async () => {
      const activeRes = await service.listKnowledgeBaseItems({ isActive: true });
      expect(activeRes.total).toBe(3);

      const inactiveRes = await service.listKnowledgeBaseItems({ isActive: false });
      expect(inactiveRes.total).toBe(1);
      expect(inactiveRes.items[0].canonicalQuestionText).toContain('allergic rhinitis');
    });

    it('should paginate correctly with page and limit parameters', async () => {
      const page1 = await service.listKnowledgeBaseItems({ limit: 2, page: 1 });
      expect(page1.items).toHaveLength(2);
      expect(page1.page).toBe(1);
      expect(page1.totalPages).toBe(2);
      expect(page1.total).toBe(4);

      const page2 = await service.listKnowledgeBaseItems({ limit: 2, page: 2 });
      expect(page2.items).toHaveLength(2);
      expect(page2.page).toBe(2);

      // Verify disjoint sets between pages
      const idsPage1 = page1.items.map((i) => i.id);
      const idsPage2 = page2.items.map((i) => i.id);
      expect(idsPage1.some((id) => idsPage2.includes(id))).toBe(false);
    });

    it('should compute aggregated Knowledge Base KPI stats', async () => {
      const stats = await service.getKnowledgeBaseStats();
      expect(stats.totalQuestions).toBe(4);
      expect(stats.activeQuestions).toBe(3);
      expect(stats.inactiveQuestions).toBe(1);
      expect(stats.totalConsultations).toBe(4);
      expect(stats.totalAnswers).toBe(4);
      expect(typeof stats.vectorIndexActive).toBe('boolean');
    });
  });
});
