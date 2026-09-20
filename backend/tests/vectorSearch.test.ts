import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Level1Question from '../src/models/Level1Question';
import {
  checkVectorIndexStatus,
  createVectorSearchIndex,
  isVectorIndexReady,
  searchLevel1QuestionsDualMode,
  searchLevel1QuestionsInMemory,
  VECTOR_INDEX_NAME,
} from '../src/services/vectorSearchService';
import { getAIServices } from '../src/services/ai/aiContainer';

describe('Vector Search Service & Dual-Mode Query', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Level1Question.deleteMany({});
  });

  describe('Index Status and DDL in In-Memory / Unsupported Environment', () => {
    it('checkVectorIndexStatus should safely return UNSUPPORTED in MongoMemoryServer without throwing', async () => {
      const status = await checkVectorIndexStatus(VECTOR_INDEX_NAME);
      expect(status.exists).toBe(false);
      expect(status.queryable).toBe(false);
      expect(status.status).toBe('UNSUPPORTED');
    });

    it('isVectorIndexReady should return false in MongoMemoryServer', async () => {
      const ready = await isVectorIndexReady(VECTOR_INDEX_NAME);
      expect(ready).toBe(false);
    });

    it('createVectorSearchIndex should catch unsupported search index commands in MongoMemoryServer', async () => {
      await expect(createVectorSearchIndex({ waitForReady: false })).rejects.toThrow();
    });
  });

  describe('Dual-Mode Vector Search Execution (Fallback Mode)', () => {
    it('should transparently fall back to in-memory cosine ranking when $vectorSearch stage fails', async () => {
      const ai = getAIServices();
      const embHeadache = await ai.embedding.generateEmbedding('severe migraine headache remedies');
      const embStomach = await ai.embedding.generateEmbedding('stomach acid gastritis digestion pain');
      const embInactive = await ai.embedding.generateEmbedding('inactive headache query');

      // Seed 3 questions
      const q1 = await Level1Question.create({
        canonicalQuestionText: 'What are remedies for severe headache?',
        embedding: embHeadache,
        tags: ['headache', 'migraine'],
        isActive: true,
      });

      const q2 = await Level1Question.create({
        canonicalQuestionText: 'How to treat acid reflux and gastric trouble?',
        embedding: embStomach,
        tags: ['stomach', 'gastric'],
        isActive: true,
      });

      const q3 = await Level1Question.create({
        canonicalQuestionText: 'Disabled headache remedy',
        embedding: embInactive,
        tags: ['headache'],
        isActive: false, // Inactive
      });

      // Search for headache remedies
      const queryEmb = await ai.embedding.generateEmbedding('headache pain relief');
      const results = await searchLevel1QuestionsDualMode(queryEmb, 5);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(2); // Only q1 and q2 because q3 is inactive

      // q1 (headache) should rank higher than q2 (stomach)
      expect(results[0].level1QuestionId.toString()).toBe(q1._id.toString());
      expect(results[0].canonicalQuestionText).toBe(q1.canonicalQuestionText);
      expect(results[0].score).toBeGreaterThan(results[1].score);

      // Verify inactive document is never returned
      const ids = results.map((r) => r.level1QuestionId.toString());
      expect(ids).not.toContain(q3._id.toString());
    });

    it('should safely return empty array if query embedding is empty or invalid', async () => {
      const resEmpty = await searchLevel1QuestionsDualMode([], 5);
      expect(resEmpty).toEqual([]);

      const resNull = await searchLevel1QuestionsDualMode(null as any, 5);
      expect(resNull).toEqual([]);
    });

    it('should support explicit forceFallback option', async () => {
      const ai = getAIServices();
      const emb = await ai.embedding.generateEmbedding('testing explicit fallback');

      await Level1Question.create({
        canonicalQuestionText: 'Testing explicit fallback question',
        embedding: emb,
        isActive: true,
      });

      const results = await searchLevel1QuestionsDualMode(emb, 1, { forceFallback: true });
      expect(results.length).toBe(1);
      expect(results[0].score).toBeCloseTo(1.0, 2);
    });
  });

  describe('Simulated Native Atlas $vectorSearch Pipeline Execution', () => {
    it('should properly format and execute $vectorSearch aggregation pipeline when supported', async () => {
      const ai = getAIServices();
      const dummyEmbedding = new Array(1536).fill(0.01);

      const mockResults = [
        {
          _id: new mongoose.Types.ObjectId(),
          canonicalQuestionText: 'Atlas native match question',
          tags: ['atlas'],
          isActive: true,
          score: 0.9425,
        },
      ];

      // Spy on Level1Question.aggregate to simulate Atlas returning native results
      const aggregateSpy = jest.spyOn(Level1Question, 'aggregate').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockResults),
      } as any);

      const results = await searchLevel1QuestionsDualMode(dummyEmbedding, 3);

      expect(aggregateSpy).toHaveBeenCalledTimes(1);
      const pipelineArg = aggregateSpy.mock.calls[0][0] as any[];

      // Verify the $vectorSearch stage
      expect(pipelineArg[0].$vectorSearch).toBeDefined();
      expect(pipelineArg[0].$vectorSearch.index).toBe('vector_index');
      expect(pipelineArg[0].$vectorSearch.path).toBe('embedding');
      expect(pipelineArg[0].$vectorSearch.queryVector).toEqual(dummyEmbedding);
      expect(pipelineArg[0].$vectorSearch.limit).toBe(3);
      expect(pipelineArg[0].$vectorSearch.filter).toEqual({ isActive: { $eq: true } });

      // Verify projection stage
      expect(pipelineArg[1].$project.score).toEqual({ $meta: 'vectorSearchScore' });

      // Verify candidate mapping
      expect(results.length).toBe(1);
      expect(results[0].canonicalQuestionText).toBe('Atlas native match question');
      expect(results[0].score).toBe(0.9425);

      aggregateSpy.mockRestore();
    });
  });
});
