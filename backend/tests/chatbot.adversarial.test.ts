import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app';
import { seedChatbotFixtures, SeededChatbotData } from './helpers/chatbotFixtures';
import { getAIServices, setAIServices, resetAIServices } from '../src/services/ai/aiContainer';
import Level1Question from '../src/models/Level1Question';
import ChatbotSession from '../src/models/ChatbotSession';
import NeedsReviewQuery from '../src/models/NeedsReviewQuery';

describe('Chatbot Engine Backend — Adversarial & Boundary Test Suite', () => {
  let mongoServer: MongoMemoryServer;
  let fixtures: SeededChatbotData;

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
    delete process.env.MATCH_CONFIDENCE_THRESHOLD;
    resetAIServices();
    fixtures = await seedChatbotFixtures();
  });

  afterEach(async () => {
    delete process.env.MATCH_CONFIDENCE_THRESHOLD;
    resetAIServices();
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  // ==========================================
  // Adversarial 1: Input Validation & Malformed Payloads
  // ==========================================
  describe('Adversarial 1: Query Payload Edge Cases', () => {
    it('should reject empty body with HTTP 400', async () => {
      const res = await request(app).post('/chatbot/query').send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Intent');
    });

    it('should reject invalid or unsupported intent enum with HTTP 400', async () => {
      const res = await request(app).post('/chatbot/query').send({
        text: 'I have a headache',
        intent: 'unsupported_intent',
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Intent must be either');
    });

    it('should reject whitespace-only text with HTTP 400', async () => {
      const res = await request(app).post('/chatbot/query').send({
        text: '    \t\n  ',
        intent: 'direct_answer',
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Query text or voiceData is required');
    });

    it('should reject voice mode when audio/voiceData is missing or empty', async () => {
      const res = await request(app).post('/chatbot/query').send({
        inputMode: 'voice',
        intent: 'direct_answer',
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('voiceData is required');
    });

    it('should safely handle NoSQL injection or script tags in query text without crashing', async () => {
      const res = await request(app).post('/chatbot/query').send({
        text: '<script>alert("XSS")</script> \'; DROP TABLE users; -- {"$gt": ""}',
        intent: 'direct_answer',
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.matchConfident).toBe(false);
    });
  });

  // ==========================================
  // Adversarial 2: Consultation Answer Edge Cases
  // ==========================================
  describe('Adversarial 2: Consultation Answer Resolution Edge Cases', () => {
    it('should reject missing sessionId with HTTP 400', async () => {
      const res = await request(app).post('/chatbot/consultation-answer').send({
        answers: { q1: 'yes' },
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('sessionId is required');
    });

    it('should reject malformed sessionId format with HTTP 400', async () => {
      const res = await request(app).post('/chatbot/consultation-answer').send({
        sessionId: 'not-a-valid-mongo-id',
        answers: { q1: 'yes' },
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid sessionId format');
    });

    it('should return 404 when sessionId is valid ObjectId but does not exist in DB', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app).post('/chatbot/consultation-answer').send({
        sessionId: fakeId,
        answers: { q1: 'yes' },
      });
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Session not found');
    });

    it('should reject consultation answer on an unconfident session with HTTP 400', async () => {
      // Create session with matchConfident: false
      const unconfidentSession = await ChatbotSession.create({
        originalQueryText: 'unrelated topic',
        originalLanguage: 'en',
        translatedQueryText: 'unrelated topic',
        inputMode: 'text',
        intent: 'consultation',
        matchCandidates: [],
        matchConfident: false,
      });

      const res = await request(app).post('/chatbot/consultation-answer').send({
        sessionId: unconfidentSession._id.toString(),
        answers: { q1: 'yes' },
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('does not have a confident consultation match');
    });

    it('should reject empty or missing answers map with HTTP 400', async () => {
      const validSession = await ChatbotSession.create({
        originalQueryText: 'migraine',
        originalLanguage: 'en',
        translatedQueryText: 'migraine',
        inputMode: 'text',
        intent: 'consultation',
        matchCandidates: [],
        matchedLevel1QuestionId: fixtures.migraineQuestion._id,
        matchConfident: true,
      });

      const res = await request(app).post('/chatbot/consultation-answer').send({
        sessionId: validSession._id.toString(),
        answers: {},
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('answers map is required');
    });

    it('should reject invalid answer values (e.g. "maybe" or "sometimes") with HTTP 400', async () => {
      const validSession = await ChatbotSession.create({
        originalQueryText: 'migraine',
        originalLanguage: 'en',
        translatedQueryText: 'migraine',
        inputMode: 'text',
        intent: 'consultation',
        matchCandidates: [],
        matchedLevel1QuestionId: fixtures.migraineQuestion._id,
        matchConfident: true,
      });

      const res = await request(app).post('/chatbot/consultation-answer').send({
        sessionId: validSession._id.toString(),
        answers: { q1: 'maybe', q2: 'yes' },
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Must be 'yes' or 'no'");
    });

    it('should fall back gracefully to default branch when answers do not match any explicit branch', async () => {
      const validSession = await ChatbotSession.create({
        originalQueryText: 'migraine',
        originalLanguage: 'en',
        translatedQueryText: 'migraine',
        inputMode: 'text',
        intent: 'consultation',
        matchCandidates: [],
        matchedLevel1QuestionId: fixtures.migraineQuestion._id,
        matchConfident: true,
      });

      // q1: 'no', q2: 'yes' does not match any explicit branch condition in fixtures
      const res = await request(app).post('/chatbot/consultation-answer').send({
        sessionId: validSession._id.toString(),
        answers: { q1: 'no', q2: 'yes' },
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.answer).toBeDefined();
      expect(res.body.answer.personalizedAnswer).toBeDefined();
      expect(res.body.matchedBranch).toBeDefined();
    });

    it('should return HTTP 500 when consultation answer resolution encounters an unhandled runtime error', async () => {
      const validSession = await ChatbotSession.create({
        originalQueryText: 'migraine',
        originalLanguage: 'en',
        translatedQueryText: 'migraine',
        inputMode: 'text',
        intent: 'consultation',
        matchCandidates: [],
        matchedLevel1QuestionId: fixtures.migraineQuestion._id,
        matchConfident: true,
      });

      const failingLLM = {
        translateToEnglish: jest.fn(),
        generateAnswer: jest.fn(),
        generatePersonalizedAnswer: jest.fn().mockRejectedValue(new Error('Database or AI service crashed')),
      };
      setAIServices({ llm: failingLLM });

      const res = await request(app).post('/chatbot/consultation-answer').send({
        sessionId: validSession._id.toString(),
        answers: { q1: 'yes', q2: 'yes' },
      });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Database or AI service crashed');
    });
  });

  // ==========================================
  // Adversarial 3: Dynamic Threshold Boundaries (0.60 vs 0.90)
  // ==========================================
  describe('Adversarial 3: Threshold Boundary Behavior', () => {
    it('should treat a candidate with score 0.82 as fallback when threshold is 0.90', async () => {
      process.env.MATCH_CONFIDENCE_THRESHOLD = '0.90';

      const res = await request(app).post('/chatbot/query').send({
        text: 'What is the recommended homeopathic treatment for tension headaches?',
        intent: 'direct_answer',
      });

      // Because the text is identical, its similarity is 1.0 >= 0.90
      expect(res.body.matchConfident).toBe(true);

      // Now query with slightly lower overlap (e.g. partial query scoring ~0.80)
      const partialRes = await request(app).post('/chatbot/query').send({
        text: 'I have severe tension in my head',
        intent: 'direct_answer',
      });

      expect(partialRes.status).toBe(200);
      // With threshold 0.90, partial overlap falls below threshold
      expect(partialRes.body.matchConfident).toBe(false);
      expect(partialRes.body.fallback).toBe(true);
      expect(partialRes.body.needsReviewId).toBeDefined();
    });

    it('should treat that same partial query as confident when threshold is relaxed to 0.60', async () => {
      process.env.MATCH_CONFIDENCE_THRESHOLD = '0.60';

      const res = await request(app).post('/chatbot/query').send({
        text: 'I have severe tension in my head',
        intent: 'direct_answer',
      });

      expect(res.status).toBe(200);
      expect(res.body.matchConfident).toBe(true);
      expect(res.body.fallback).toBeUndefined();
    });
  });

  // ==========================================
  // Adversarial 4: Custom Mock AI Injection & Swapping
  // ==========================================
  describe('Adversarial 4: Runtime Mock AI Injections', () => {
    it('should allow custom mock embeddings that trigger exact threshold boundaries', async () => {
      const ai = getAIServices();
      const customEmbedding = new Array(1536).fill(0);
      customEmbedding[0] = 1.0;

      // Register exact boundary vectors
      ai.embedding.generateEmbedding = jest.fn().mockResolvedValue(customEmbedding);

      // Force Level 1 question embedding to have dot product of 0.74 (below 0.75)
      const targetVec = new Array(1536).fill(0);
      targetVec[0] = 0.74;
      targetVec[1] = Math.sqrt(1 - 0.74 * 0.74); // unit vector

      await Level1Question.updateOne(
        { _id: fixtures.headacheQuestion._id },
        { embedding: targetVec }
      );

      const res = await request(app).post('/chatbot/query').send({
        text: 'test boundary 0.74',
        intent: 'direct_answer',
      });

      expect(res.body.confidenceScore).toBe(0.74);
      expect(res.body.matchConfident).toBe(false);
      expect(res.body.fallback).toBe(true);
    });

    it('should handle runtime AI service exceptions gracefully', async () => {
      const failingLLM = {
        translateToEnglish: jest.fn().mockRejectedValue(new Error('LLM Translation Service Timeout')),
        generateAnswer: jest.fn().mockRejectedValue(new Error('LLM Service Unavailable')),
        generatePersonalizedAnswer: jest.fn().mockRejectedValue(new Error('LLM Service Unavailable')),
      };

      setAIServices({ llm: failingLLM });

      const res = await request(app).post('/chatbot/query').send({
        text: 'headache treatment',
        intent: 'direct_answer',
      });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('LLM Translation Service Timeout');
    });
  });

  // ==========================================
  // Adversarial 5: Empty Database Edge Case
  // ==========================================
  describe('Adversarial 5: Empty Database State', () => {
    it('should return fallback response without crashing when no Level1Questions exist', async () => {
      await Level1Question.deleteMany({});

      const res = await request(app).post('/chatbot/query').send({
        text: 'What is the recommended homeopathic treatment for tension headaches?',
        intent: 'direct_answer',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.matchConfident).toBe(false);
      expect(res.body.confidenceScore).toBe(0);
      expect(res.body.matchCandidates).toEqual([]);
      expect(res.body.fallback).toBe(true);
      expect(res.body.needsReviewId).toBeDefined();

      const needsReview = await NeedsReviewQuery.findById(res.body.needsReviewId);
      expect(needsReview).not.toBeNull();
    });
  });
});
