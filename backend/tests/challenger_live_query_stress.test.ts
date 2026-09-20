import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app';
import { getAIServices, resetAIServices, createDefaultAIServices } from '../src/services/ai/aiContainer';
import { GeminiLLMService } from '../src/services/ai/gemini/geminiLLMService';
import { GeminiEmbeddingService } from '../src/services/ai/gemini/geminiEmbeddingService';
import { MockLLMService } from '../src/services/ai/mock/mockLLMService';
import { MockEmbeddingService } from '../src/services/ai/mock/mockEmbeddingService';
import Level1Question, { ILevel1Question } from '../src/models/Level1Question';
import Answer, { IAnswer } from '../src/models/Answer';
import ConsultationQuery from '../src/models/ConsultationQuery';
import ChatbotSession from '../src/models/ChatbotSession';
import NeedsReviewQuery from '../src/models/NeedsReviewQuery';
import QueryClickStats from '../src/models/QueryClickStats';

describe('Empirical Challenger: Live Backend Query Resolution Pipeline Stress Test', () => {
  let mongoServer: MongoMemoryServer;
  const originalUseMockAi = process.env.USE_MOCK_AI;
  const originalGeminiKey = process.env.GEMINI_API_KEY;

  beforeAll(async () => {
    // Ensure live Gemini services are active for stress testing
    process.env.USE_MOCK_AI = 'false';
    resetAIServices();

    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  }, 35000);

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    process.env.USE_MOCK_AI = originalUseMockAi;
    if (originalGeminiKey) {
      process.env.GEMINI_API_KEY = originalGeminiKey;
    }
    resetAIServices();
  });

  beforeEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
    process.env.USE_MOCK_AI = 'false';
    if (originalGeminiKey) {
      process.env.GEMINI_API_KEY = originalGeminiKey;
    }
    resetAIServices();
  });

  describe('1. Container Service Instantiation & Key Handling', () => {
    it('instantiates GeminiLLMService and GeminiEmbeddingService when GEMINI_API_KEY is present', () => {
      process.env.USE_MOCK_AI = 'false';
      resetAIServices();
      const ai = getAIServices();
      expect(ai.llm).toBeInstanceOf(GeminiLLMService);
      expect(ai.embedding).toBeInstanceOf(GeminiEmbeddingService);
      expect(ai.embedding.dimensions).toBe(1536);
    });

    it('falls back cleanly to MockLLMService and MockEmbeddingService when USE_MOCK_AI=true', () => {
      process.env.USE_MOCK_AI = 'true';
      resetAIServices();
      const ai = getAIServices();
      expect(ai.llm).toBeInstanceOf(MockLLMService);
      expect(ai.embedding).toBeInstanceOf(MockEmbeddingService);
    });

    it('falls back cleanly to Mock services when GEMINI_API_KEY is unset', () => {
      process.env.USE_MOCK_AI = 'false';
      delete process.env.GEMINI_API_KEY;
      resetAIServices();
      const ai = getAIServices();
      expect(ai.llm).toBeInstanceOf(MockLLMService);
      expect(ai.embedding).toBeInstanceOf(MockEmbeddingService);
    });
  });

  describe('2. Live Query Resolution Pipeline & Dynamic Answer Generation', () => {
    it('processes /api/chatbot/query dynamically without returning hardcoded stubs', async () => {
      process.env.USE_MOCK_AI = 'false';
      resetAIServices();
      const ai = getAIServices();

      const seedQuery = 'What is the natural homeopathic remedy for chronic sinusitis?';
      const embedding = await ai.embedding.generateEmbedding(seedQuery);

      const l1Doc = await Level1Question.create({
        canonicalQuestionText: seedQuery,
        embedding,
        tags: ['sinusitis', 'chronic'],
        isActive: true,
        version: 1,
      });

      const answerDoc = await Answer.create({
        level1QuestionId: l1Doc._id,
        answerText: 'Clinical sinus guidance: Kali Bichromicum 30C or Silicea 30C for thick nasal discharge.',
        dosageInstructions: 'Take 4 globules twice daily under tongue.',
        homeRemedyText: 'Eucalyptus steam inhalation twice daily.',
        safetyDisclaimerText: 'If facial swelling or high fever occurs, seek acute clinical evaluation.',
      });

      const res = await request(app)
        .post('/api/chatbot/query')
        .send({
          queryText: seedQuery,
          intent: 'direct_answer',
          language: 'en',
          inputMode: 'text',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.matchConfident).toBe(true);
      expect(res.body.confidenceScore).toBeGreaterThanOrEqual(0.75);
      expect(res.body.answer).toBeDefined();
      expect(res.body.answer.id).toBe(answerDoc._id.toString());

      const dynamicAnswer = res.body.answer.answerText;
      expect(typeof dynamicAnswer).toBe('string');
      expect(dynamicAnswer.length).toBeGreaterThan(20);

      // Verify no hardcoded stubs from old code or mock adapters
      expect(dynamicAnswer).not.toContain('Here is your personalized homeopathic healing regimen curated by Dr. Anjali Jariwala:');
      expect(dynamicAnswer).not.toContain('Guidance for query: "');
      expect(dynamicAnswer).not.toContain('Consultation recommendation for "');

      // Verify session logged
      const session = await ChatbotSession.findById(res.body.sessionId);
      expect(session).not.toBeNull();
      expect(session!.matchConfident).toBe(true);
      expect(session!.matchedLevel1QuestionId?.toString()).toBe(l1Doc._id.toString());
      expect(session!.matchCandidates.length).toBeGreaterThan(0);

      // Verify click stats tracked
      const stats = await QueryClickStats.findOne({ level1QuestionId: l1Doc._id });
      expect(stats).not.toBeNull();
      expect(stats!.clickCount).toBe(1);
    }, 45000);

    it('processes consultation path and generates personalized consultation answer', async () => {
      process.env.USE_MOCK_AI = 'false';
      resetAIServices();
      const ai = getAIServices();

      const seedQuery = 'What homeopathic remedy works for acute allergic rhinitis?';
      const embedding = await ai.embedding.generateEmbedding(seedQuery);

      const l1Doc = await Level1Question.create({
        canonicalQuestionText: seedQuery,
        embedding,
        tags: ['rhinitis', 'allergy'],
        isActive: true,
        version: 1,
      });

      const answerDoc = await Answer.create({
        level1QuestionId: l1Doc._id,
        answerText: 'Allium Cepa 30C for profuse watery acrid nasal discharge and bland lacrimation.',
        dosageInstructions: '4 pellets every 3 hours during acute sneezing episodes.',
      });

      await ConsultationQuery.create({
        level1QuestionId: l1Doc._id,
        diagnosticQuestions: [
          { id: 'q1', questionText: 'Is the nasal discharge burning and excoriating the upper lip?' },
          { id: 'q2', questionText: 'Are the symptoms noticeably worse in a warm room and better in open air?' },
        ],
        answerBranches: [
          {
            conditions: { q1: 'yes', q2: 'yes' },
            resolvedAnswerId: answerDoc._id,
          },
        ],
      });

      // 1. Initial consultation query
      const queryRes = await request(app)
        .post('/api/chatbot/query')
        .send({
          queryText: seedQuery,
          intent: 'consultation',
        });

      expect(queryRes.status).toBe(200);
      expect(queryRes.body.success).toBe(true);
      expect(queryRes.body.intent).toBe('consultation');
      expect(queryRes.body.diagnosticQuestions).toBeDefined();
      expect(queryRes.body.diagnosticQuestions.length).toBe(2);

      const sessionId = queryRes.body.sessionId;
      expect(sessionId).toBeDefined();

      // 2. Resolve consultation answer
      const consultRes = await request(app)
        .post('/api/chatbot/consultation-answer')
        .send({
          sessionId,
          answers: { q1: 'yes', q2: 'yes' },
        });

      expect(consultRes.status).toBe(200);
      expect(consultRes.body.success).toBe(true);
      expect(consultRes.body.answer).toBeDefined();
      expect(consultRes.body.answer.personalizedAnswer).toBeDefined();

      const personalizedText = consultRes.body.answer.personalizedAnswer;
      expect(personalizedText).toContain('Personalized Homeopathic Plan');
      expect(personalizedText.length).toBeGreaterThan(40);
    }, 45000);
  });

  describe('3. Edge Case Stress Testing', () => {
    it('handles empty strings and whitespace-only query text with 400 Bad Request without crashing', async () => {
      // Empty string
      const res1 = await request(app)
        .post('/api/chatbot/query')
        .send({
          queryText: '',
          intent: 'direct_answer',
        });
      expect(res1.status).toBe(400);
      expect(res1.body.success).toBe(false);
      expect(res1.body.message).toMatch(/required/i);

      // Whitespace only
      const res2 = await request(app)
        .post('/api/chatbot/query')
        .send({
          queryText: '    \n\t   ',
          intent: 'direct_answer',
        });
      expect(res2.status).toBe(400);
      expect(res2.body.success).toBe(false);
      expect(res2.body.message).toMatch(/required/i);

      // Blank aliases (text, query)
      const res3 = await request(app)
        .post('/api/chatbot/query')
        .send({
          text: '',
          intent: 'direct_answer',
        });
      expect(res3.status).toBe(400);
      expect(res3.body.success).toBe(false);

      // Empty object
      const res4 = await request(app)
        .post('/api/chatbot/query')
        .send({});
      expect(res4.status).toBe(400);
      expect(res4.body.success).toBe(false);
    });

    it('rejects missing or invalid intent with 400 Bad Request', async () => {
      const res1 = await request(app)
        .post('/api/chatbot/query')
        .send({
          queryText: 'Headache remedy',
        });
      expect(res1.status).toBe(400);
      expect(res1.body.success).toBe(false);
      expect(res1.body.message).toContain("Intent must be either 'direct_answer' or 'consultation'");

      const res2 = await request(app)
        .post('/api/chatbot/query')
        .send({
          queryText: 'Headache remedy',
          intent: 'unsupported_intent',
        });
      expect(res2.status).toBe(400);
      expect(res2.body.success).toBe(false);
      expect(res2.body.message).toContain("Intent must be either 'direct_answer' or 'consultation'");
    });

    it('handles unknown medical condition or low-confidence match with fallback and creates NeedsReviewQuery', async () => {
      process.env.USE_MOCK_AI = 'false';
      resetAIServices();

      // Ensure no matching high-similarity questions in DB
      const res = await request(app)
        .post('/api/chatbot/query')
        .send({
          queryText: 'Sub-space warp plasma conduit magnetic flux imbalance syndrome',
          intent: 'direct_answer',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.matchConfident).toBe(false);
      expect(res.body.fallback).toBe(true);
      expect(res.body.message).toBeDefined();
      expect(res.body.needsReviewId).toBeDefined();
      expect(res.body.sessionId).toBeDefined();

      // Verify NeedsReviewQuery document logged in database
      const reviewDoc = await NeedsReviewQuery.findById(res.body.needsReviewId);
      expect(reviewDoc).not.toBeNull();
      expect(reviewDoc!.status).toBe('pending');
      expect(reviewDoc!.originalQueryText).toContain('Sub-space warp plasma');
      expect(reviewDoc!.sessionId.toString()).toBe(res.body.sessionId);

      // Verify ChatbotSession recorded as low confidence
      const sessionDoc = await ChatbotSession.findById(res.body.sessionId);
      expect(sessionDoc).not.toBeNull();
      expect(sessionDoc!.matchConfident).toBe(false);
    }, 45000);

    it('handles extreme long prompts (3000+ chars) gracefully without crashing or buffer overflow', async () => {
      process.env.USE_MOCK_AI = 'false';
      resetAIServices();

      const longMedicalHistory = `
        The patient is a 45-year-old presenting with a multi-year history of fluctuating symptoms.
        Over the past 6 months, there has been an escalation in bilateral temple throbbing,
        recurrent morning occipital tension radiating toward the neck and shoulders.
        Aggravation occurs noticeably with intense mental exertion, bright fluorescent screen exposure,
        and lack of continuous restorative sleep. Warm compresses provide slight transient relief,
        while cold air breezes trigger right-sided retro-orbital pressure and mild photophobia.
        Previous trials included over-the-counter paracetamol with negligible benefit.
        Associated symptoms include intermittent post-nasal drip, mild gastric fullness after meals,
        and heightened irritability in crowded environments.
        Seeking safe, non-toxic homeopathic options that can address both the underlying constitutional sensitivity
        and provide symptomatic relief during acute morning flare-ups without causing daytime sedation.
      `.repeat(6); // ~3500 chars

      const res = await request(app)
        .post('/api/chatbot/query')
        .send({
          queryText: longMedicalHistory,
          intent: 'direct_answer',
        });

      // Server must accept and process the large payload without crashing
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.sessionId).toBeDefined();
    }, 60000);

    it('validates consultation-answer endpoint edge cases (invalid ID, missing answers, 404 session)', async () => {
      // 1. Missing sessionId
      const res1 = await request(app)
        .post('/api/chatbot/consultation-answer')
        .send({
          answers: { q1: 'yes' },
        });
      expect(res1.status).toBe(400);
      expect(res1.body.message).toContain('sessionId is required');

      // 2. Malformed sessionId
      const res2 = await request(app)
        .post('/api/chatbot/consultation-answer')
        .send({
          sessionId: 'not-an-objectid',
          answers: { q1: 'yes' },
        });
      expect(res2.status).toBe(400);
      expect(res2.body.message).toContain('Invalid sessionId format');

      // 3. Non-existent sessionId (valid ObjectId format)
      const fakeSessionId = new mongoose.Types.ObjectId().toString();
      const res3 = await request(app)
        .post('/api/chatbot/consultation-answer')
        .send({
          sessionId: fakeSessionId,
          answers: { q1: 'yes' },
        });
      expect(res3.status).toBe(404);
      expect(res3.body.message).toContain('Session not found');

      // 4. Missing answers
      const res4 = await request(app)
        .post('/api/chatbot/consultation-answer')
        .send({
          sessionId: fakeSessionId,
          answers: {},
        });
      expect(res4.status).toBe(400);
      expect(res4.body.message).toContain('answers map is required');

      // 5. Invalid answer values (e.g. "maybe")
      // First create a mock session that is confident
      const dummySession = await ChatbotSession.create({
        originalQueryText: 'Migraine test',
        originalLanguage: 'en',
        translatedQueryText: 'Migraine test',
        inputMode: 'text',
        intent: 'consultation',
        matchConfident: true,
        matchedLevel1QuestionId: new mongoose.Types.ObjectId(),
        matchCandidates: [],
      });

      const res5 = await request(app)
        .post('/api/chatbot/consultation-answer')
        .send({
          sessionId: dummySession._id.toString(),
          answers: { q1: 'maybe' },
        });
      expect(res5.status).toBe(400);
      expect(res5.body.message).toMatch(/Must be 'yes' or 'no'/i);

      // 6. Calling consultation-answer on unconfident session
      const unconfidentSession = await ChatbotSession.create({
        originalQueryText: 'Unmatched query',
        originalLanguage: 'en',
        translatedQueryText: 'Unmatched query',
        inputMode: 'text',
        intent: 'consultation',
        matchConfident: false,
        matchCandidates: [],
      });

      const res6 = await request(app)
        .post('/api/chatbot/consultation-answer')
        .send({
          sessionId: unconfidentSession._id.toString(),
          answers: { q1: 'yes' },
        });
      expect(res6.status).toBe(400);
      expect(res6.body.message).toContain('Session does not have a confident consultation match');
    });

    it('validates voice input mode requires audio / voiceData', async () => {
      const res = await request(app)
        .post('/api/chatbot/query')
        .send({
          inputMode: 'voice',
          intent: 'direct_answer',
        });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("voiceData is required when inputMode is 'voice'");
    });
  });
});
