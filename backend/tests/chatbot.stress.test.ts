import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app';
import { seedChatbotFixtures, SeededChatbotData } from './helpers/chatbotFixtures';
import { getAIServices, setAIServices, resetAIServices } from '../src/services/ai/aiContainer';
import { cosineSimilarity, searchLevel1Questions } from '../src/utils/vectorSimilarity';
import ChatbotSession from '../src/models/ChatbotSession';
import QueryClickStats from '../src/models/QueryClickStats';
import Level1Question from '../src/models/Level1Question';
import { generateToken } from '../src/utils/jwt';

describe('Chatbot Engine Backend — Empirical Stress & Invariant Harness (Challenger 2)', () => {
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

  // =========================================================================
  // 1. CONCURRENCY ON QueryClickStats ($inc atomic increments)
  // =========================================================================
  describe('Area 1: Concurrency on QueryClickStats ($inc atomic increments)', () => {
    it('1.1 should atomically increment clickCount under high concurrency (50 parallel requests on warm record)', async () => {
      // Seed warm record with initial click
      const warmupRes = await request(app)
        .post('/chatbot/query')
        .send({
          text: 'What is the recommended homeopathic treatment for tension headaches?',
          intent: 'direct_answer',
        });
      expect(warmupRes.status).toBe(200);

      const initialStats = await QueryClickStats.findOne({ level1QuestionId: fixtures.headacheQuestion._id });
      expect(initialStats).not.toBeNull();
      expect(initialStats!.clickCount).toBe(1);

      // Launch 50 concurrent requests for the exact same question
      const CONCURRENT_REQUESTS = 50;
      const requestPromises = Array.from({ length: CONCURRENT_REQUESTS }, () =>
        request(app)
          .post('/chatbot/query')
          .send({
            text: 'What is the recommended homeopathic treatment for tension headaches?',
            intent: 'direct_answer',
          })
      );

      const responses = await Promise.all(requestPromises);

      // Verify every single request succeeded
      for (const res of responses) {
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.matchConfident).toBe(true);
      }

      // Check final clickCount
      const finalStats = await QueryClickStats.findOne({ level1QuestionId: fixtures.headacheQuestion._id });
      expect(finalStats).not.toBeNull();
      // Initial 1 + 50 concurrent = 51 total clicks
      expect(finalStats!.clickCount).toBe(1 + CONCURRENT_REQUESTS);
    });

    it('1.2 should handle cold-start concurrency (30 concurrent requests on brand-new question)', async () => {
      // Ensure zero stats exist for headache question initially
      await QueryClickStats.deleteMany({ level1QuestionId: fixtures.headacheQuestion._id });

      const CONCURRENT_COUNT = 30;
      const promises = Array.from({ length: CONCURRENT_COUNT }, () =>
        request(app)
          .post('/chatbot/query')
          .send({
            text: 'What is the recommended homeopathic treatment for tension headaches?',
            intent: 'direct_answer',
          })
      );

      const responses = await Promise.all(promises);

      for (const res of responses) {
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      }

      const allStats = await QueryClickStats.find({ level1QuestionId: fixtures.headacheQuestion._id });
      expect(allStats.length).toBeGreaterThanOrEqual(1);

      // Sum of clickCount across any created records should equal exactly CONCURRENT_COUNT
      const totalClicks = allStats.reduce((acc, stat) => acc + stat.clickCount, 0);
      expect(totalClicks).toBe(CONCURRENT_COUNT);
    });

    it('1.3 should partition click stats correctly under concurrent multi-user queries', async () => {
      const user1Token = generateToken({
        userId: fixtures.testUser._id.toString(),
        email: fixtures.testUser.email!,
        authProvider: 'email_otp',
      });

      const secondUser = new mongoose.Types.ObjectId();
      const user2Token = generateToken({
        userId: secondUser.toString(),
        email: 'user2@example.com',
        authProvider: 'google',
      });

      const BATCH_PER_USER = 10;
      const user1Requests = Array.from({ length: BATCH_PER_USER }, () =>
        request(app)
          .post('/chatbot/query')
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            text: 'What is the recommended homeopathic treatment for tension headaches?',
            intent: 'direct_answer',
          })
      );

      const user2Requests = Array.from({ length: BATCH_PER_USER }, () =>
        request(app)
          .post('/chatbot/query')
          .set('Authorization', `Bearer ${user2Token}`)
          .send({
            text: 'What is the recommended homeopathic treatment for tension headaches?',
            intent: 'direct_answer',
          })
      );

      const guestRequests = Array.from({ length: BATCH_PER_USER }, () =>
        request(app)
          .post('/chatbot/query')
          .send({
            text: 'What is the recommended homeopathic treatment for tension headaches?',
            intent: 'direct_answer',
          })
      );

      await Promise.all([...user1Requests, ...user2Requests, ...guestRequests]);

      const user1Stats = await QueryClickStats.findOne({
        level1QuestionId: fixtures.headacheQuestion._id,
        userId: fixtures.testUser._id,
      });
      expect(user1Stats).not.toBeNull();
      expect(user1Stats!.clickCount).toBe(BATCH_PER_USER);

      const user2Stats = await QueryClickStats.findOne({
        level1QuestionId: fixtures.headacheQuestion._id,
        userId: secondUser,
      });
      expect(user2Stats).not.toBeNull();
      expect(user2Stats!.clickCount).toBe(BATCH_PER_USER);

      const guestStats = await QueryClickStats.findOne({
        level1QuestionId: fixtures.headacheQuestion._id,
        userId: null,
      });
      expect(guestStats).not.toBeNull();
      expect(guestStats!.clickCount).toBe(BATCH_PER_USER);

      // Total clicks across all partitioned stats documents for this question must equal exactly 30 (10 + 10 + 10).
      const allQuestionStats = await QueryClickStats.find({
        level1QuestionId: fixtures.headacheQuestion._id,
      });
      const totalClicks = allQuestionStats.reduce((sum, s) => sum + s.clickCount, 0);
      expect(totalClicks).toBe(BATCH_PER_USER * 3); // 30 total
    });
  });

  // =========================================================================
  // 2. SESSION STATE INTEGRITY IN ChatbotSession
  // =========================================================================
  describe('Area 2: Session State Updates in ChatbotSession (Metadata Preservation)', () => {
    it('2.1 should strictly preserve all initial metadata when resolving consultation answer', async () => {
      const userToken = generateToken({
        userId: fixtures.testUser._id.toString(),
        email: fixtures.testUser.email!,
        authProvider: 'email_otp',
      });

      // 1. Create consultation session via voice & hindi context
      const queryRes = await request(app)
        .post('/chatbot/query')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          text: 'मुझे माइग्रेन की शिकायत है',
          language: 'hi',
          intent: 'consultation',
        });

      expect(queryRes.status).toBe(200);
      const sessionId = queryRes.body.sessionId;

      // Inspect pristine session before consultation resolution
      const sessionBefore = await ChatbotSession.findById(sessionId).lean();
      expect(sessionBefore).not.toBeNull();
      expect(sessionBefore!.userId?.toString()).toBe(fixtures.testUser._id.toString());
      expect(sessionBefore!.originalQueryText).toBe('मुझे माइग्रेन की शिकायत है');
      expect(sessionBefore!.originalLanguage).toBe('hi');
      expect(sessionBefore!.translatedQueryText).toBe('I suffer from migraines');
      expect(sessionBefore!.inputMode).toBe('text');
      expect(sessionBefore!.intent).toBe('consultation');
      expect(sessionBefore!.matchConfident).toBe(true);
      expect(sessionBefore!.matchedLevel1QuestionId?.toString()).toBe(fixtures.migraineQuestion._id.toString());
      expect(sessionBefore!.matchCandidates.length).toBeGreaterThanOrEqual(1);
      expect(sessionBefore!.consultationAnswers).toBeUndefined();
      expect(sessionBefore!.finalAnswerId).toBeUndefined();
      const initialCreatedAt = sessionBefore!.createdAt;

      // Small delay to verify createdAt is not mutated on update
      await new Promise((r) => setTimeout(r, 10));

      // 2. Resolve consultation answer
      const answerRes = await request(app)
        .post('/chatbot/consultation-answer')
        .send({
          sessionId,
          answers: {
            q1: 'yes',
            q2: 'yes',
          },
        });

      expect(answerRes.status).toBe(200);
      expect(answerRes.body.success).toBe(true);
      expect(answerRes.body.answer.personalizedAnswer).toContain('Localized for hi');

      // 3. Inspect updated session document in MongoDB
      const sessionAfter = await ChatbotSession.findById(sessionId).lean();
      expect(sessionAfter).not.toBeNull();

      // STRICT INVARIANTS: Metadata MUST NOT be overwritten or corrupted
      expect(sessionAfter!._id.toString()).toBe(sessionBefore!._id.toString());
      expect(sessionAfter!.userId?.toString()).toBe(sessionBefore!.userId?.toString());
      expect(sessionAfter!.originalQueryText).toBe(sessionBefore!.originalQueryText);
      expect(sessionAfter!.originalLanguage).toBe(sessionBefore!.originalLanguage);
      expect(sessionAfter!.translatedQueryText).toBe(sessionBefore!.translatedQueryText);
      expect(sessionAfter!.inputMode).toBe(sessionBefore!.inputMode);
      expect(sessionAfter!.intent).toBe(sessionBefore!.intent);
      expect(sessionAfter!.matchConfident).toBe(sessionBefore!.matchConfident);
      expect(sessionAfter!.matchedLevel1QuestionId?.toString()).toBe(sessionBefore!.matchedLevel1QuestionId?.toString());
      expect(sessionAfter!.matchCandidates.length).toBe(sessionBefore!.matchCandidates.length);
      expect(new Date(sessionAfter!.createdAt).getTime()).toBe(new Date(initialCreatedAt).getTime());

      // Newly populated fields
      expect(sessionAfter!.finalAnswerId?.toString()).toBe(fixtures.severeMigraineAnswer._id.toString());
      expect(sessionAfter!.consultationAnswers).toBeDefined();
    });

    it('2.2 should handle concurrent consultation answer submissions on the same session safely', async () => {
      const queryRes = await request(app)
        .post('/chatbot/query')
        .send({
          text: 'What homeopathic remedies help with acute migraine pain?',
          intent: 'consultation',
        });
      const sessionId = queryRes.body.sessionId;

      // Fire 10 concurrent requests submitting diagnostic answers on the same session
      const CONCURRENT_ANSWERS = 10;
      const answerPromises = Array.from({ length: CONCURRENT_ANSWERS }, () =>
        request(app)
          .post('/chatbot/consultation-answer')
          .send({
            sessionId,
            answers: { q1: 'yes', q2: 'yes' },
          })
      );

      const responses = await Promise.all(answerPromises);
      for (const res of responses) {
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.answer.id).toBe(fixtures.severeMigraineAnswer._id.toString());
      }

      // Verify session integrity in DB
      const session = await ChatbotSession.findById(sessionId);
      expect(session).not.toBeNull();
      expect(session!.finalAnswerId?.toString()).toBe(fixtures.severeMigraineAnswer._id.toString());
    });

    it('2.3 should update consultation answers when user resubmits updated answers', async () => {
      const queryRes = await request(app)
        .post('/chatbot/query')
        .send({
          text: 'What homeopathic remedies help with acute migraine pain?',
          intent: 'consultation',
        });
      const sessionId = queryRes.body.sessionId;

      // Submit severe answers first
      await request(app)
        .post('/chatbot/consultation-answer')
        .send({
          sessionId,
          answers: { q1: 'yes', q2: 'yes' },
        });

      let session = await ChatbotSession.findById(sessionId);
      expect(session!.finalAnswerId?.toString()).toBe(fixtures.severeMigraineAnswer._id.toString());

      // Resubmit mild answers
      const updatedRes = await request(app)
        .post('/chatbot/consultation-answer')
        .send({
          sessionId,
          answers: { q1: 'no', q2: 'no' },
        });

      expect(updatedRes.status).toBe(200);
      expect(updatedRes.body.answer.id).toBe(fixtures.mildMigraineAnswer._id.toString());

      session = await ChatbotSession.findById(sessionId);
      expect(session!.finalAnswerId?.toString()).toBe(fixtures.mildMigraineAnswer._id.toString());
    });
  });

  // =========================================================================
  // 3. SWAPPABLE AI CONTAINER BEHAVIOR UNDER TEST ISOLATION
  // =========================================================================
  describe('Area 3: Swappable AI Container Behavior Under Test Isolation', () => {
    it('3.1 should maintain strict isolation when resetting custom AI services', async () => {
      const initialServices = getAIServices();

      const customLLM = {
        translateToEnglish: jest.fn().mockResolvedValue({ translatedText: 'isolated translation', detectedLanguage: 'de' }),
        generateAnswer: jest.fn().mockResolvedValue('isolated answer'),
        generatePersonalizedAnswer: jest.fn().mockResolvedValue('isolated personalized'),
        generateConversationalResponse: jest.fn().mockResolvedValue('isolated conversational'),
      };

      setAIServices({ llm: customLLM });
      expect(getAIServices().llm).toBe(customLLM);

      // Verify query uses custom LLM
      const res = await request(app)
        .post('/chatbot/query')
        .send({
          text: 'Kopfschmerzen',
          intent: 'direct_answer',
        });

      expect(customLLM.translateToEnglish).toHaveBeenCalled();

      // Reset and verify isolation
      resetAIServices();
      const restoredServices = getAIServices();
      expect(restoredServices.llm).not.toBe(customLLM);
      expect(restoredServices.llm).not.toBe(initialServices.llm); // fresh instance
    });

    it('3.2 should handle partial container overrides without corrupting other services', async () => {
      const defaultServices = getAIServices();
      const originalSTT = defaultServices.stt;
      const originalEmbedding = defaultServices.embedding;

      const customTTS = {
        synthesizeSpeech: jest.fn().mockResolvedValue({
          audioBuffer: Buffer.from('custom-tts-buffer'),
          mimeType: 'audio/wav',
        }),
      };

      setAIServices({ tts: customTTS });

      const currentServices = getAIServices();
      expect(currentServices.tts).toBe(customTTS);
      // Other services should remain untouched
      expect(currentServices.stt).toBe(originalSTT);
      expect(currentServices.embedding).toBe(originalEmbedding);

      resetAIServices();
    });

    it('3.3 should handle vectors with mismatched dimensions in cosineSimilarity gracefully', async () => {
      // vecA has 512 dimensions, vecB has 1536 dimensions
      const vecA = new Array(512).fill(0.1);
      const vecB = new Array(1536).fill(0.1);

      // Must not throw error and return a bounded number
      const sim = cosineSimilarity(vecA, vecB);
      expect(typeof sim).toBe('number');
      expect(sim).toBeGreaterThanOrEqual(0);
      expect(sim).toBeLessThanOrEqual(1);

      // Zero-length vector checks
      expect(cosineSimilarity([], vecB)).toBe(0);
      expect(cosineSimilarity(vecA, [])).toBe(0);
      expect(cosineSimilarity([], [])).toBe(0);
    });

    it('3.4 should safely handle searchLevel1Questions when question embedding is empty or null', async () => {
      // Insert corrupt Level1Question with null embedding
      await Level1Question.create({
        canonicalQuestionText: 'Corrupt question without embedding',
        tags: ['corrupt'],
        embedding: [],
        isActive: true,
      });

      const ai = getAIServices();
      const queryEmb = await ai.embedding.generateEmbedding('headache remedies');

      // searchLevel1Questions should not throw, should filter out empty embeddings
      const candidates = await searchLevel1Questions(queryEmb, 5);
      expect(Array.isArray(candidates)).toBe(true);
      for (const candidate of candidates) {
        expect(candidate.score).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // =========================================================================
  // 4. MULTILINGUAL AND VOICE PROCESSING RESILIENCE
  // =========================================================================
  describe('Area 4: Multilingual and Voice Processing Resilience', () => {
    it('4.1 should handle registered Spanish query deterministically', async () => {
      const res = await request(app)
        .post('/chatbot/query')
        .send({
          text: 'tengo dolor de cabeza',
          language: 'es',
          intent: 'direct_answer',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.matchConfident).toBe(true);
      expect(res.body.matchedLevel1Question.id).toBe(fixtures.headacheQuestion._id.toString());

      const session = await ChatbotSession.findById(res.body.sessionId);
      expect(session!.originalLanguage).toBe('es');
      expect(session!.translatedQueryText).toBe('I have a headache');
    });

    it('4.2 should handle unseen Devanagari Hindi text gracefully', async () => {
      const unseenHindi = 'मुझे बहुत ज्यादा चक्कर और सिर में भारीपन लग रहा है';
      const res = await request(app)
        .post('/chatbot/query')
        .send({
          text: unseenHindi,
          language: 'hi',
          intent: 'direct_answer',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const session = await ChatbotSession.findById(res.body.sessionId);
      expect(session!.originalLanguage).toBe('hi');
      expect(session!.translatedQueryText).toContain('Translated:');
    });

    it('4.3 should handle queries with emojis and punctuation without crashing', async () => {
      const emojiQuery = '🤕 Head pain & migraine relief! What to do? 💊';
      const res = await request(app)
        .post('/chatbot/query')
        .send({
          text: emojiQuery,
          intent: 'direct_answer',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.matchConfident).toBe(true);
      expect(res.body.matchedLevel1Question.id).toBe(fixtures.migraineQuestion._id.toString());
    });

    it('4.4 should handle binary audio buffers in STT gracefully without crashing', async () => {
      // Simulate raw audio bytes buffer encoded as base64
      const rawAudioBytes = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x00, 0xff, 0xee, 0xdd]);
      const base64Audio = rawAudioBytes.toString('base64');

      const res = await request(app)
        .post('/chatbot/query')
        .send({
          audio: base64Audio,
          inputMode: 'voice',
          mimeType: 'audio/webm',
          intent: 'direct_answer',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.sessionId).toBeDefined();

      const session = await ChatbotSession.findById(res.body.sessionId);
      expect(session!.inputMode).toBe('voice');
      // Mock STT returns deterministic default transcript for non-text audio
      expect(session!.originalQueryText).toContain('severe throbbing headache');
    });

    it('4.5 should reject voice mode when audio string is whitespace-only', async () => {
      const res = await request(app)
        .post('/chatbot/query')
        .send({
          audio: '    ',
          inputMode: 'voice',
          intent: 'direct_answer',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('voiceData is required');
    });

    it('4.6 should handle large audio payload safely without memory or stack overflow', async () => {
      // 50KB base64 audio payload
      const largeAudio = Buffer.alloc(50000, 0x41).toString('base64');

      const res = await request(app)
        .post('/chatbot/query')
        .send({
          audio: largeAudio,
          inputMode: 'voice',
          intent: 'direct_answer',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.sessionId).toBeDefined();
    });
  });
});
