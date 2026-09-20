import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import Level1Question from '../src/models/Level1Question';
import ConsultationQuery from '../src/models/ConsultationQuery';
import Answer from '../src/models/Answer';
import ChatbotSession from '../src/models/ChatbotSession';
import adminKnowledgeBaseService, {
  AdminKnowledgeBaseService,
} from '../src/services/adminKnowledgeBaseService';
import {
  checkVectorIndexStatus,
  isVectorIndexReady,
  searchLevel1QuestionsDualMode,
  searchLevel1QuestionsInMemory,
  VECTOR_INDEX_NAME,
} from '../src/services/vectorSearchService';
import { resetAIServices, getAIServices } from '../src/services/ai/aiContainer';

describe('Milestone M1 Challenger 2: Concurrency, Transaction Boundaries & Vector Index Integrity', () => {
  let replSet: MongoMemoryReplSet;
  let service: AdminKnowledgeBaseService;

  beforeAll(async () => {
    jest.setTimeout(60000);
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = replSet.getUri();
    await mongoose.connect(uri);
    service = adminKnowledgeBaseService;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  beforeEach(async () => {
    resetAIServices();
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  // ==========================================================================
  // 1. Transaction Boundaries & Rollback Integrity on Replica Set
  // ==========================================================================
  describe('Transaction Boundaries & Rollback Integrity on Replica Set', () => {
    it('TRANSACTION ABORT INTEGRITY: atomically rolls back Level1Question and ConsultationQuery when Answer creation fails midway', async () => {
      // In MongoMemoryReplSet, transactions are fully supported.
      // We simulate failure on Answer creation.
      const originalCreate = Answer.create;
      const answerCreateSpy = jest.spyOn(Answer, 'create').mockImplementation((async () => {
        throw new Error('SIMULATED_ANSWER_PERSISTENCE_FAILURE');
      }) as any);

      await expect(
        service.createKnowledgeBaseItem({
          canonicalQuestionText: 'Atomic rollback test question',
          diagnosticQuestions: ['Atomic diagnostic question 1?'],
          answerText: 'Remedy text that will fail',
        })
      ).rejects.toThrow('SIMULATED_ANSWER_PERSISTENCE_FAILURE');

      // VERIFY COMPLETE ROLLBACK IN DATABASE:
      // None of the documents should exist!
      const questions = await Level1Question.find({
        canonicalQuestionText: 'Atomic rollback test question',
      });
      const consults = await ConsultationQuery.find({});
      const answers = await Answer.find({});

      expect(questions.length).toBe(0);
      expect(consults.length).toBe(0);
      expect(answers.length).toBe(0);

      // Clean up spy
      answerCreateSpy.mockRestore();
    });

    it('TRANSACTION ABORT INTEGRITY: atomically rolls back Level1Question when ConsultationQuery creation fails midway', async () => {
      const consultCreateSpy = jest
        .spyOn(ConsultationQuery, 'create')
        .mockImplementation((async () => {
          throw new Error('SIMULATED_CONSULTATION_PERSISTENCE_FAILURE');
        }) as any);

      await expect(
        service.createKnowledgeBaseItem({
          canonicalQuestionText: 'Consultation failure rollback test',
          diagnosticQuestions: ['Diag?'],
          answerText: 'Answer?',
        })
      ).rejects.toThrow('SIMULATED_CONSULTATION_PERSISTENCE_FAILURE');

      // Question MUST NOT remain orphaned
      const questions = await Level1Question.find({});
      expect(questions.length).toBe(0);

      consultCreateSpy.mockRestore();
    });

    it('UPDATE ROLLBACK INTEGRITY: aborts transaction and reverts document if answer update fails mid-flight', async () => {
      const item = await service.createKnowledgeBaseItem({
        canonicalQuestionText: 'Original text for update rollback test',
        diagnosticQuestions: ['Original diagnostic question?'],
        answerText: 'Original answer text',
        remedyText: 'Original remedy',
      });

      // Verify baseline
      expect(item.id).toBeDefined();

      // Spy on Answer.prototype.save to throw an error during update
      const answerSaveSpy = jest
        .spyOn(Answer.prototype, 'save')
        .mockImplementation(async function (this: any) {
          throw new Error('SIMULATED_ANSWER_SAVE_FAILURE_DURING_UPDATE');
        });

      await expect(
        service.updateKnowledgeBaseItem(item.id, {
          canonicalQuestionText: 'Mutated question title that should be rolled back',
          answerText: 'Mutated answer that should fail',
          homeRemedyText: 'Mutated remedy',
        })
      ).rejects.toThrow('SIMULATED_ANSWER_SAVE_FAILURE_DURING_UPDATE');

      // Verify the question in DB was rolled back to its original state
      const dbQuestion = await Level1Question.findById(item.id);
      expect(dbQuestion?.canonicalQuestionText).toBe('Original text for update rollback test');
      expect(dbQuestion?.version).toBe(1); // Version was NOT permanently incremented

      answerSaveSpy.mockRestore();
    });

    it('CASCADE DELETE ROLLBACK INTEGRITY: aborts transaction if question deletion fails midway', async () => {
      const item = await service.createKnowledgeBaseItem({
        canonicalQuestionText: 'Cascade delete rollback test',
        diagnosticQuestions: ['Diag?'],
        answerText: 'Answer?',
      });

      // Mock Level1Question.deleteOne to fail after answers/consultations were queued
      const deleteOneSpy = jest
        .spyOn(Level1Question, 'deleteOne')
        .mockImplementation((async () => {
          throw new Error('SIMULATED_QUESTION_DELETE_FAILURE');
        }) as any);

      await expect(service.deleteKnowledgeBaseItem(item.id)).rejects.toThrow(
        'SIMULATED_QUESTION_DELETE_FAILURE'
      );

      // Verify ALL entities remain intact due to transaction abort
      const dbQuestion = await Level1Question.findById(item.id);
      const dbConsult = await ConsultationQuery.findOne({ level1QuestionId: item.id });
      const dbAnswer = await Answer.findOne({ level1QuestionId: item.id });

      expect(dbQuestion).not.toBeNull();
      expect(dbConsult).not.toBeNull();
      expect(dbAnswer).not.toBeNull();

      deleteOneSpy.mockRestore();
    });
  });

  // ==========================================================================
  // 2. High Concurrency & Race Condition Stress Testing
  // ==========================================================================
  describe('High Concurrency & Race Condition Stress Testing', () => {
    it('executes 50 rapid concurrent composite item creates with 100% data integrity', async () => {
      const BATCH_SIZE = 50;
      const start = Date.now();

      const createPromises = Array.from({ length: BATCH_SIZE }, (_, i) =>
        service.createKnowledgeBaseItem({
          canonicalQuestionText: `Concurrent Create KB Question #${i + 1}`,
          tags: ['concurrency', `tag-${i % 10}`],
          diagnosticQuestions: [
            `Diagnostic question A for item ${i + 1}?`,
            `Diagnostic question B for item ${i + 1}?`,
          ],
          answerText: `Primary remedy guidance for item ${i + 1}`,
          homeRemedyText: `Home remedy natural treatment for item ${i + 1}`,
          videoUrl: `https://youtu.be/video_${i + 1}`,
        })
      );

      const createdItems = await Promise.all(createPromises);
      const elapsedMs = Date.now() - start;

      // Verify all 50 items were created
      expect(createdItems.length).toBe(BATCH_SIZE);

      // Verify unique IDs
      const uniqueIds = new Set(createdItems.map((item) => item.id));
      expect(uniqueIds.size).toBe(BATCH_SIZE);

      // Verify exact collection counts
      const [countQ, countC, countA] = await Promise.all([
        Level1Question.countDocuments({ tags: 'concurrency' }),
        ConsultationQuery.countDocuments(),
        Answer.countDocuments(),
      ]);

      expect(countQ).toBe(BATCH_SIZE);
      expect(countC).toBe(BATCH_SIZE);
      expect(countA).toBe(BATCH_SIZE);

      // Verify referential linkage integrity for every single item
      for (const item of createdItems) {
        expect(item.consultationQuery).toBeDefined();
        expect(item.consultationQuery?.diagnosticQuestions.length).toBe(2);
        expect(item.answer).toBeDefined();
        expect(item.answer?.answerText).toContain('Primary remedy guidance');
      }

      console.log(`[Challenger 2] 50 concurrent creates succeeded in ${elapsedMs}ms`);
    });

    it('handles 20 rapid concurrent updates on the SAME KnowledgeBaseItem without corrupting data', async () => {
      const item = await service.createKnowledgeBaseItem({
        canonicalQuestionText: 'Base question for concurrent update stress',
        tags: ['base'],
        diagnosticQuestions: ['Initial question?'],
        answerText: 'Initial remedy',
      });

      // Fire 20 concurrent updates modifying fields
      const updatePromises = Array.from({ length: 20 }, (_, i) =>
        service.updateKnowledgeBaseItem(item.id, {
          canonicalQuestionText: `Updated question title by worker ${i + 1}`,
          tags: ['base', `worker-${i}`],
          homeRemedyText: `Updated remedy by worker ${i + 1}`,
        })
      );

      const results = await Promise.allSettled(updatePromises);

      const rejected = results.filter((r) => r.status === 'rejected');
      if (rejected.length > 0) {
        console.log('[Challenger 2] Concurrent update rejected count:', rejected.length);
        console.log('[Challenger 2] Sample rejection error:', (rejected[0] as any).reason);
      }

      // Check whether failures are WriteConflict / TransientTransactionError
      for (const res of results) {
        if (res.status === 'rejected') {
          const err = (res as any).reason;
          console.log('[Challenger 2] Error details:', err?.message, 'Code:', err?.code, 'Labels:', err?.errorLabels);
        }
      }

      // Check final state in DB
      const finalItem = await service.getKnowledgeBaseItemById(item.id);
      expect(finalItem).not.toBeNull();
      expect(finalItem?.id).toBe(item.id);
      expect(finalItem?.canonicalQuestionText).toContain('Updated question title by worker');
      expect(finalItem?.version).toBeGreaterThanOrEqual(2);

      // Ensure no duplicate consultations or answers were spawned
      const consults = await ConsultationQuery.find({ level1QuestionId: item.id });
      const answers = await Answer.find({ level1QuestionId: item.id });
      expect(consults.length).toBe(1);
      expect(answers.length).toBe(1);
    });

    it('handles concurrent update and delete races on the same item gracefully', async () => {
      const item = await service.createKnowledgeBaseItem({
        canonicalQuestionText: 'Race condition target question',
        answerText: 'Race condition remedy',
      });

      // Race 5 updates against 1 delete
      const racers = [
        service.updateKnowledgeBaseItem(item.id, { canonicalQuestionText: 'Race update 1' }),
        service.updateKnowledgeBaseItem(item.id, { canonicalQuestionText: 'Race update 2' }),
        service.deleteKnowledgeBaseItem(item.id),
        service.updateKnowledgeBaseItem(item.id, { canonicalQuestionText: 'Race update 3' }),
        service.updateKnowledgeBaseItem(item.id, { canonicalQuestionText: 'Race update 4' }),
      ];

      const outcomes = await Promise.allSettled(racers);

      const rejectedOutcomes = outcomes.filter((o) => o.status === 'rejected');
      if (rejectedOutcomes.length > 0) {
        console.log('[Challenger 2] Race update/delete rejected count:', rejectedOutcomes.length);
        console.log('[Challenger 2] Race rejection error:', (rejectedOutcomes[0] as any).reason);
      }

      // Check whether failures are WriteConflict / TransientTransactionError
      for (const outcome of outcomes) {
        if (outcome.status === 'rejected') {
          const err = (outcome as any).reason;
          console.log('[Challenger 2] Race error:', err?.message, 'Labels:', err?.errorLabels);
        }
      }

      // Final state: referential consistency must be maintained
      const finalLookup = await service.getKnowledgeBaseItemById(item.id);
      const remainingConsults = await ConsultationQuery.find({ level1QuestionId: item.id });
      const remainingAnswers = await Answer.find({ level1QuestionId: item.id });

      if (finalLookup === null) {
        expect(remainingConsults.length).toBe(0);
        expect(remainingAnswers.length).toBe(0);
      }
    });

    it('handles 10 rapid concurrent deletes on the SAME item with referential integrity under lock contention', async () => {
      const item = await service.createKnowledgeBaseItem({
        canonicalQuestionText: 'Item for multiple delete stress test',
        answerText: 'Remedy for multiple delete',
      });

      const deletePromises = Array.from({ length: 10 }, () =>
        service.deleteKnowledgeBaseItem(item.id)
      );

      const settledResults = await Promise.allSettled(deletePromises);

      // Inspect outcomes: some may succeed, some may encounter WriteConflict/LockTimeout, some may return null
      const fulfilled = settledResults.filter((r) => r.status === 'fulfilled');
      const rejected = settledResults.filter((r) => r.status === 'rejected');

      console.log(
        `[Challenger 2] Concurrent deletes: ${fulfilled.length} fulfilled, ${rejected.length} write-conflicts/rejected`
      );

      // At least one delete must succeed OR the item must be completely deleted
      // Verify final database state: 0 questions, 0 consultations, 0 answers
      const remainingQ = await Level1Question.findById(item.id);
      const remainingC = await ConsultationQuery.findOne({ level1QuestionId: item.id });
      const remainingA = await Answer.find({ level1QuestionId: item.id });

      // If at least one transaction committed, everything is deleted cleanly
      if (fulfilled.some((r: any) => r.value?.success === true)) {
        expect(remainingQ).toBeNull();
        expect(remainingC).toBeNull();
        expect(remainingA.length).toBe(0);
      }

      // Crucial: No partial/orphan state where question exists without answer or vice-versa
      if (remainingQ === null) {
        expect(remainingC).toBeNull();
        expect(remainingA.length).toBe(0);
      }
    });

    it('mixed workload: 40 concurrent mixed operations (creates, reads, updates, deletes, stats, list)', async () => {
      // Pre-seed 10 items
      const preSeeded = await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          service.createKnowledgeBaseItem({
            canonicalQuestionText: `Pre-seed Item ${i + 1}`,
            tags: ['preseeded'],
            answerText: `Pre-seed remedy ${i + 1}`,
          })
        )
      );

      const mixedOps: Promise<any>[] = [];

      // 10 creates
      for (let i = 0; i < 10; i++) {
        mixedOps.push(
          service.createKnowledgeBaseItem({
            canonicalQuestionText: `Mixed load new question ${i + 1}`,
            tags: ['mixed'],
            answerText: `Remedy ${i + 1}`,
          })
        );
      }

      // 10 reads (by ID & search list)
      for (let i = 0; i < 10; i++) {
        const targetId = preSeeded[i % preSeeded.length].id;
        mixedOps.push(service.getKnowledgeBaseItemById(targetId));
        mixedOps.push(service.listKnowledgeBaseItems({ search: 'Pre-seed', limit: 5 }));
      }

      // 5 updates
      for (let i = 0; i < 5; i++) {
        const targetId = preSeeded[i].id;
        mixedOps.push(
          service.updateKnowledgeBaseItem(targetId, {
            canonicalQuestionText: `Updated Pre-seed ${i + 1}`,
            homeRemedyText: `Updated home remedy ${i + 1}`,
          })
        );
      }

      // 5 deletes
      for (let i = 5; i < 10; i++) {
        const targetId = preSeeded[i].id;
        mixedOps.push(service.deleteKnowledgeBaseItem(targetId));
      }

      // 5 stats queries
      for (let i = 0; i < 5; i++) {
        mixedOps.push(service.getKnowledgeBaseStats());
      }

      const results = await Promise.allSettled(mixedOps);

      const rejectedMixed = results.filter((r) => r.status === 'rejected');
      if (rejectedMixed.length > 0) {
        console.log('[Challenger 2] Mixed ops rejected count:', rejectedMixed.length);
        console.log('[Challenger 2] Sample mixed rejection error:', (rejectedMixed[0] as any).reason);
      }
      for (const res of results) {
        if (res.status === 'rejected') {
          const err = (res as any).reason;
          console.log('[Challenger 2] Mixed error:', err?.message, 'Labels:', err?.errorLabels);
        }
      }

      // Check stats sanity after all mixed operations
      const finalStats = await service.getKnowledgeBaseStats();
      expect(finalStats.totalQuestions).toBeGreaterThanOrEqual(10);
      expect(finalStats.totalConsultations).toBe(finalStats.totalQuestions);
      expect(finalStats.totalAnswers).toBe(finalStats.totalQuestions);
    });
  });

  // ==========================================================================
  // 3. Vector Index Status & Missing Embeddings Edge Cases
  // ==========================================================================
  describe('Vector Index Status & Missing Embeddings Edge Cases', () => {
    it('checkVectorIndexStatus on non-existent index safely returns NOT_FOUND or UNSUPPORTED', async () => {
      const status = await checkVectorIndexStatus('non_existent_vector_index_999');
      expect(status.exists).toBe(false);
      expect(status.queryable).toBe(false);
      expect(['NOT_FOUND', 'UNSUPPORTED', 'NO_CONNECTION']).toContain(status.status);
    });

    it('isVectorIndexReady returns false when index does not exist', async () => {
      const ready = await isVectorIndexReady('definitely_non_existent_index');
      expect(ready).toBe(false);
    });

    it('dual-mode search gracefully falls back when index does not exist or errors', async () => {
      const ai = getAIServices();
      const emb = await ai.embedding.generateEmbedding('test question for vector fallback');

      await service.createKnowledgeBaseItem({
        canonicalQuestionText: 'Test question for vector fallback',
        embedding: emb,
        answerText: 'Fallback remedy',
      });

      // searchLevel1QuestionsDualMode should catch any Atlas index errors and fall back to in-memory
      const results = await searchLevel1QuestionsDualMode(emb, 3);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(1);
      expect(results[0].canonicalQuestionText).toBe('Test question for vector fallback');
      expect(results[0].score).toBeGreaterThan(0.9);
    });

    it('searchLevel1QuestionsDualMode handles documents with missing, empty, or null embeddings', async () => {
      const ai = getAIServices();
      const validEmb = await ai.embedding.generateEmbedding('Valid document text');

      // 1. Doc with undefined embedding
      await Level1Question.create({
        canonicalQuestionText: 'Doc with undefined embedding',
        isActive: true,
      });

      // 2. Doc with empty embedding array
      await Level1Question.create({
        canonicalQuestionText: 'Doc with empty embedding array',
        embedding: [],
        isActive: true,
      });

      // 3. Doc with valid embedding
      const validDoc = await Level1Question.create({
        canonicalQuestionText: 'Doc with valid embedding',
        embedding: validEmb,
        isActive: true,
      });

      const results = await searchLevel1QuestionsDualMode(validEmb, 5);
      expect(results.length).toBe(1);
      expect(results[0].canonicalQuestionText).toBe(validDoc.canonicalQuestionText);
    });

    it('searchLevel1QuestionsDualMode handles all zero vector without NaN', async () => {
      const zeroVec = new Array(1536).fill(0);
      const ai = getAIServices();
      const validEmb = await ai.embedding.generateEmbedding('Sample question');

      await Level1Question.create({
        canonicalQuestionText: 'Sample question',
        embedding: validEmb,
        isActive: true,
      });

      const results = await searchLevel1QuestionsDualMode(zeroVec, 5);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(1);
      expect(results[0].score).toBe(0);
      expect(Number.isNaN(results[0].score)).toBe(false);
    });

    it('searchLevel1QuestionsDualMode handles completely empty collection', async () => {
      const dummyVec = new Array(1536).fill(0.1);
      const results = await searchLevel1QuestionsDualMode(dummyVec, 5);
      expect(results).toEqual([]);
    });

    it('searchLevel1QuestionsDualMode handles all inactive questions', async () => {
      const dummyVec = new Array(1536).fill(0.1);
      await Level1Question.create({
        canonicalQuestionText: 'Inactive question 1',
        embedding: dummyVec,
        isActive: false,
      });
      await Level1Question.create({
        canonicalQuestionText: 'Inactive question 2',
        embedding: dummyVec,
        isActive: false,
      });

      const results = await searchLevel1QuestionsDualMode(dummyVec, 5);
      expect(results).toEqual([]);
    });

    it('searchLevel1QuestionsDualMode handles query embedding length mismatch (e.g. 512 dims vs 1536)', async () => {
      const dummyVec = new Array(1536).fill(0.05);
      await Level1Question.create({
        canonicalQuestionText: '1536-dim question',
        embedding: dummyVec,
        isActive: true,
      });

      const shortQuery = new Array(512).fill(0.05);
      const results = await searchLevel1QuestionsDualMode(shortQuery, 5);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(1);
      expect(results[0].score).toBeGreaterThan(0);
    });
  });
});
