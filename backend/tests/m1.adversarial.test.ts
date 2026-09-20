import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Level1Question from '../src/models/Level1Question';
import Answer from '../src/models/Answer';
import ConsultationQuery from '../src/models/ConsultationQuery';
import ChatbotSession from '../src/models/ChatbotSession';
import adminKnowledgeBaseService, {
  AdminKnowledgeBaseService,
} from '../src/services/adminKnowledgeBaseService';
import {
  searchLevel1QuestionsDualMode,
  searchLevel1QuestionsInMemory,
  VECTOR_INDEX_NAME,
} from '../src/services/vectorSearchService';
import { cosineSimilarity } from '../src/utils/vectorSimilarity';
import { resetAIServices } from '../src/services/ai/aiContainer';

describe('Milestone M1 Adversarial & Empirical Stress Test Suite', () => {
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
  // Section 1: Vector Search Service Adversarial Testing
  // ==========================================================================
  describe('Vector Search Adversarial & Corrupted Vector Handling', () => {
    it('handles zero vectors without division by zero or NaN', () => {
      const zeroVec = new Array(1536).fill(0);
      const normalVec = new Array(1536).fill(0.1);

      const simZeroVsNormal = cosineSimilarity(zeroVec, normalVec);
      expect(simZeroVsNormal).toBe(0);
      expect(Number.isNaN(simZeroVsNormal)).toBe(false);

      const simZeroVsZero = cosineSimilarity(zeroVec, zeroVec);
      expect(simZeroVsZero).toBe(0);
      expect(Number.isNaN(simZeroVsZero)).toBe(false);
    });

    it('handles unit vectors correctly (orthogonal, identical, opposite)', () => {
      const u1 = [1, 0, 0, 0];
      const u2 = [0, 1, 0, 0];
      const uIdentical = [1, 0, 0, 0];
      const uOpposite = [-1, 0, 0, 0];

      // Orthogonal -> 0
      expect(cosineSimilarity(u1, u2)).toBe(0);

      // Identical -> 1
      expect(cosineSimilarity(u1, uIdentical)).toBeCloseTo(1.0, 5);

      // Opposite -> -1
      expect(cosineSimilarity(u1, uOpposite)).toBeCloseTo(-1.0, 5);
    });

    it('handles vector dimension mismatches gracefully with zero padding', () => {
      const vec10 = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
      const vec5 = [1, 1, 1, 1, 1];

      const sim = cosineSimilarity(vec10, vec5);
      expect(Number.isFinite(sim)).toBe(true);
      expect(sim).toBeGreaterThan(0);
      expect(sim).toBeLessThanOrEqual(1);
    });

    it('handles empty arrays, null, and undefined inputs to cosineSimilarity', () => {
      expect(cosineSimilarity([], [])).toBe(0);
      expect(cosineSimilarity([1, 2], [])).toBe(0);
      expect(cosineSimilarity([], [1, 2])).toBe(0);
      expect(cosineSimilarity(null as any, [1, 2])).toBe(0);
      expect(cosineSimilarity([1, 2], null as any)).toBe(0);
      expect(cosineSimilarity(undefined as any, undefined as any)).toBe(0);
    });

    it('proves Mongoose schema rejects documents with NaN in embedding array at validation time', async () => {
      const nanVec = new Array(1536).fill(NaN);

      await expect(
        Level1Question.create({
          canonicalQuestionText: 'Document with NaN embedding',
          embedding: nanVec,
          isActive: true,
        })
      ).rejects.toThrow(/Cast to \[Number\] failed/);
    });

    it('survives raw MongoDB documents with corrupted NaN embeddings via Mongoose hydration defense', async () => {
      const db = mongoose.connection.db!;
      const col = db.collection('level1questions');

      // Insert raw document with NaN embedding bypassing Mongoose validation
      await col.insertOne({
        canonicalQuestionText: 'Raw corrupted NaN doc',
        embedding: [NaN, 0.5, 0.5, 0.5],
        isActive: true,
      });

      // Insert healthy document
      await col.insertOne({
        canonicalQuestionText: 'Raw healthy doc',
        embedding: [0.5, 0.5, 0.5, 0.5],
        isActive: true,
      });

      const results = await searchLevel1QuestionsInMemory([0.5, 0.5, 0.5, 0.5], 5);
      expect(Array.isArray(results)).toBe(true);
      // Only healthy doc is returned because Mongoose drops the NaN embedding to undefined
      expect(results.length).toBe(1);
      expect(results[0].canonicalQuestionText).toBe('Raw healthy doc');
    });

    it('reveals downstream risk: query vector with NaNs produces score: NaN which breaks ChatbotSession persistence', async () => {
      const validVec = new Array(1536).fill(0.05);
      const question = await Level1Question.create({
        canonicalQuestionText: 'Healthy test question',
        embedding: validVec,
        isActive: true,
      });

      const queryNaN = new Array(1536).fill(NaN);
      const candidates = await searchLevel1QuestionsInMemory(queryNaN, 5);

      expect(candidates.length).toBe(1);
      // Empirically observes that score evaluates to NaN
      expect(Number.isNaN(candidates[0].score)).toBe(true);

      // Downstream impact: ChatbotSession schema fails when attempting to save candidate with score: NaN
      const session = new ChatbotSession({
        userId: new mongoose.Types.ObjectId(),
        originalQueryText: 'Corrupted query text',
        originalLanguage: 'en',
        translatedQueryText: 'Corrupted query text',
        inputMode: 'text',
        intent: 'direct_answer',
        matchCandidates: [
          {
            level1QuestionId: question._id,
            score: candidates[0].score,
          },
        ],
        matchConfident: false,
      });

      await expect(session.save()).rejects.toThrow(/Cast to Number failed for value "NaN"/);
    });

    it('searchLevel1QuestionsDualMode handles corrupted query vector (wrong dimensions, null, non-array)', async () => {
      const validVec = new Array(1536).fill(0.02);
      await Level1Question.create({
        canonicalQuestionText: 'Valid doc for query testing',
        embedding: validVec,
        isActive: true,
      });

      // 1. Wrong dimension query (10 dims instead of 1536)
      const query10 = new Array(10).fill(0.1);
      const res10 = await searchLevel1QuestionsDualMode(query10, 5);
      expect(Array.isArray(res10)).toBe(true);
      expect(res10.length).toBe(1);

      // 2. Query with non-array / null / empty
      expect(await searchLevel1QuestionsDualMode(null as any, 5)).toEqual([]);
      expect(await searchLevel1QuestionsDualMode([] as any, 5)).toEqual([]);
      expect(await searchLevel1QuestionsDualMode('string' as any, 5)).toEqual([]);
    });

    it('handles extreme topK values (0, negative, excessively large)', async () => {
      const validVec = new Array(1536).fill(0.02);
      await Level1Question.create({
        canonicalQuestionText: 'Boundary topK question',
        embedding: validVec,
        isActive: true,
      });

      const res0 = await searchLevel1QuestionsDualMode(validVec, 0);
      expect(res0).toEqual([]);

      const resNeg = await searchLevel1QuestionsDualMode(validVec, -5);
      expect(resNeg).toEqual([]);

      const resBig = await searchLevel1QuestionsDualMode(validVec, 9999);
      expect(resBig.length).toBe(1);
    });
  });

  // ==========================================================================
  // Section 2: Answer Model Schema Boundary Conditions
  // ==========================================================================
  describe('Answer Model Schema Boundaries & Auto-Generation', () => {
    it('creates Answer without questionText by falling back to answerText', async () => {
      const doc = await Answer.create({
        answerText: 'Direct answer without question text',
        remedyText: 'Arnica 30C',
      });

      expect(doc._id).toBeDefined();
      expect(doc.questionText).toBe('Direct answer without question text');
      expect(doc.answerText).toBe('Direct answer without question text');
      expect(doc.remedyText).toBe('Arnica 30C');
      expect(doc.homeRemedyText).toBe('Arnica 30C');
      expect(doc.answerType).toBe('level1');
    });

    it('creates Answer with only reasonText and remedyText, verifying auto-generation of answerText', async () => {
      const doc = await Answer.create({
        reasonText: 'Aggravated by cold dry wind and shock',
        remedyText: 'Aconite Napellus 200C',
      });

      expect(doc._id).toBeDefined();
      expect(doc.reasonText).toBe('Aggravated by cold dry wind and shock');
      expect(doc.remedyText).toBe('Aconite Napellus 200C');
      expect(doc.homeRemedyText).toBe('Aconite Napellus 200C');
      // Verifies auto-generation: `${reasonText}\n\n${remedyText}`
      expect(doc.answerText).toBe('Aggravated by cold dry wind and shock\n\nAconite Napellus 200C');
      // Verifies fallback default for questionText when answerText was initially unset
      expect(doc.questionText).toBe('General Consultation Question');
    });

    it('creates Answer with only remedyText, verifying answerText and homeRemedyText synchronization', async () => {
      const doc = await Answer.create({
        remedyText: 'Bryonia Alba 30C',
      });

      expect(doc.remedyText).toBe('Bryonia Alba 30C');
      expect(doc.homeRemedyText).toBe('Bryonia Alba 30C');
      expect(doc.answerText).toBe('Bryonia Alba 30C');
      expect(doc.questionText).toBe('General Consultation Question');
    });

    it('creates Answer with empty object using schema defaults without throwing', async () => {
      const doc = await Answer.create({});

      expect(doc._id).toBeDefined();
      expect(doc.answerText).toBe('Homeopathic guidance.');
      expect(doc.questionText).toBe('General Consultation Question');
      expect(doc.answerType).toBe('level1');
    });

    it('verifies both diagnostic and level1 answer types', async () => {
      const l1Doc = await Answer.create({
        questionText: 'Level 1 question text',
        answerText: 'Level 1 guidance',
        answerType: 'level1',
      });
      expect(l1Doc.answerType).toBe('level1');

      const diagDoc = await Answer.create({
        questionText: 'Diagnostic branch question',
        answerText: 'Diagnostic remedy resolution',
        answerType: 'diagnostic',
      });
      expect(diagDoc.answerType).toBe('diagnostic');
    });

    it('rejects invalid answerType enum values', async () => {
      await expect(
        Answer.create({
          questionText: 'Question',
          answerText: 'Answer',
          answerType: 'invalid_enum' as any,
        })
      ).rejects.toThrow();
    });

    it('handles unicode, emojis, and large payload text in Answer fields', async () => {
      const largeText = 'A'.repeat(10000);
      const emojiText = '🌿 Homeopathic remedy for 🤧 sinus infection with 💧 clear mucus';

      const doc = await Answer.create({
        questionText: emojiText,
        answerText: largeText,
        reasonText: emojiText,
        remedyText: largeText,
      });

      expect(doc.questionText).toBe(emojiText);
      expect(doc.answerText).toBe(largeText);
      expect(doc.reasonText).toBe(emojiText);
      expect(doc.remedyText).toBe(largeText);
    });
  });

  // ==========================================================================
  // Section 3: CRUD Boundary Pagination & Search Regex Injection
  // ==========================================================================
  describe('CRUD Operations Boundary Pagination & Search Injection', () => {
    beforeEach(async () => {
      // Seed 5 items for pagination tests
      for (let i = 1; i <= 5; i++) {
        await service.createKnowledgeBaseItem({
          canonicalQuestionText: `Knowledge Question ${i} with special symptom details`,
          tags: [`tag${i}`, 'common'],
          answerText: `Prescription remedy ${i} for treatment`,
          homeRemedyText: `Home remedy ${i} instructions`,
        });
      }
    });

    it('handles page: 0 safely by clamping to page 1', async () => {
      const res = await service.listKnowledgeBaseItems({ page: 0, limit: 2 });
      expect(res.page).toBe(1);
      expect(res.items.length).toBe(2);
      expect(res.total).toBe(5);
    });

    it('handles negative page: -5 safely by clamping to page 1', async () => {
      const res = await service.listKnowledgeBaseItems({ page: -5, limit: 2 });
      expect(res.page).toBe(1);
      expect(res.items.length).toBe(2);
      expect(res.total).toBe(5);
    });

    it('handles excessive limit: 9999 safely by clamping to max limit (100)', async () => {
      const res = await service.listKnowledgeBaseItems({ page: 1, limit: 9999 });
      expect(res.limit).toBe(100);
      expect(res.items.length).toBe(5);
    });

    it('handles negative limit: -10 and zero limit: 0 safely', async () => {
      const resNeg = await service.listKnowledgeBaseItems({ limit: -10 });
      expect(resNeg.limit).toBe(1);

      const resZero = await service.listKnowledgeBaseItems({ limit: 0 });
      expect(resZero.limit).toBe(20); // 0 || 20 fallback
    });

    it('handles out-of-range page numbers without crashing', async () => {
      const res = await service.listKnowledgeBaseItems({ page: 100, limit: 10 });
      expect(res.items).toEqual([]);
      expect(res.total).toBe(5);
      expect(res.page).toBe(100);
    });

    it('handles regex metacharacters in search queries without throwing or breaking regex', async () => {
      // Create a document that actually contains regex characters
      await service.createKnowledgeBaseItem({
        canonicalQuestionText: 'Remedy for [Stage 1] Cough (Dry/Hacking) + Fever? *Special*',
        answerText: 'Aconite + Bryonia [200C]. Formula: x+y=z.',
      });

      const dangerousQueries = [
        '.*',
        '+',
        '*',
        '?',
        '^',
        '$',
        '{',
        '}',
        '(',
        ')',
        '|',
        '[',
        ']',
        '\\',
        '.*+?^${}()|[]\\',
        '((((((((a+)+)+)+)+)+)+)+)b', // ReDoS catastrophic backtracking test
        "'; DROP TABLE users; --",
        '{"$gt": ""}',
      ];

      for (const query of dangerousQueries) {
        const result = await service.listKnowledgeBaseItems({ search: query });
        expect(result).toBeDefined();
        expect(Array.isArray(result.items)).toBe(true);
        expect(typeof result.total).toBe('number');
      }

      // Exact match with escaped brackets and symbols
      const matchBracket = await service.listKnowledgeBaseItems({ search: '[Stage 1]' });
      expect(matchBracket.total).toBe(1);
      expect(matchBracket.items[0].canonicalQuestionText).toContain('[Stage 1]');

      const matchFormula = await service.listKnowledgeBaseItems({ search: 'x+y=z' });
      expect(matchFormula.total).toBe(1);
      expect(matchFormula.items[0].answer?.answerText).toContain('x+y=z');
    });

    it('handles cascade delete on non-existent valid ObjectId and invalid ID strings', async () => {
      // Valid ObjectId that doesn't exist
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res1 = await service.deleteKnowledgeBaseItem(nonExistentId);
      expect(res1).toBeNull();

      // Invalid ID strings
      expect(await service.deleteKnowledgeBaseItem('invalid-id')).toBeNull();
      expect(await service.deleteKnowledgeBaseItem('')).toBeNull();
      expect(await service.deleteKnowledgeBaseItem('12345')).toBeNull();
      expect(await service.deleteKnowledgeBaseItem('null')).toBeNull();
      expect(await service.deleteKnowledgeBaseItem('undefined')).toBeNull();

      // Double deletion
      const item = await service.createKnowledgeBaseItem({
        canonicalQuestionText: 'Double deletion target',
        answerText: 'Double delete test remedy',
      });

      const del1 = await service.deleteKnowledgeBaseItem(item.id);
      expect(del1).not.toBeNull();
      expect(del1?.success).toBe(true);

      const del2 = await service.deleteKnowledgeBaseItem(item.id);
      expect(del2).toBeNull();
    });

    it('handles update with non-existent or invalid IDs safely', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      expect(await service.updateKnowledgeBaseItem(nonExistentId, { canonicalQuestionText: 'New' })).toBeNull();
      expect(await service.updateKnowledgeBaseItem('invalid-id', { canonicalQuestionText: 'New' })).toBeNull();
    });
  });

  // ==========================================================================
  // Section 4: Concurrency and High-Load Stress Testing
  // ==========================================================================
  describe('Concurrency & Data Integrity Stress Tests', () => {
    it('handles 30 concurrent Knowledge Base item creations without race conditions', async () => {
      const promises = Array.from({ length: 30 }, (_, i) =>
        service.createKnowledgeBaseItem({
          canonicalQuestionText: `Concurrent Stress Test Question #${i + 1}`,
          tags: ['stress', `batch-${i % 5}`],
          diagnosticQuestions: [`Diagnostic condition for batch ${i}?`],
          answerText: `Stress answer remedy ${i}`,
          homeRemedyText: `Stress home remedy instructions ${i}`,
        })
      );

      const results = await Promise.all(promises);
      expect(results.length).toBe(30);

      const countQ = await Level1Question.countDocuments({ tags: 'stress' });
      const countC = await ConsultationQuery.countDocuments();
      const countA = await Answer.countDocuments();

      expect(countQ).toBe(30);
      expect(countC).toBe(30);
      expect(countA).toBe(30);

      // Verify each item has unique valid ID and correct linkage
      const ids = new Set(results.map((r) => r.id));
      expect(ids.size).toBe(30);
    });

    it('handles concurrent reads, updates, and deletes simultaneously', async () => {
      // Seed 10 items
      const items = await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          service.createKnowledgeBaseItem({
            canonicalQuestionText: `Mixed concurrency item ${i}`,
            answerText: `Remedy for mixed item ${i}`,
          })
        )
      );

      // Concurrently perform: 5 reads, 3 updates, 2 deletes
      const ops = [
        service.getKnowledgeBaseItemById(items[0].id),
        service.getKnowledgeBaseItemById(items[1].id),
        service.listKnowledgeBaseItems({ search: 'mixed' }),
        service.getKnowledgeBaseStats(),
        service.updateKnowledgeBaseItem(items[2].id, { canonicalQuestionText: 'Updated mixed item 2' }),
        service.updateKnowledgeBaseItem(items[3].id, { answerText: 'Updated answer for item 3' }),
        service.deleteKnowledgeBaseItem(items[8].id),
        service.deleteKnowledgeBaseItem(items[9].id),
      ];

      const results = await Promise.allSettled(ops);
      for (const res of results) {
        expect(res.status).toBe('fulfilled');
      }

      // Check final stats consistency
      const stats = await service.getKnowledgeBaseStats();
      expect(stats.totalQuestions).toBe(8);
      expect(stats.totalConsultations).toBe(8);
      expect(stats.totalAnswers).toBe(8);
    });
  });
});
