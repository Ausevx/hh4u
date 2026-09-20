import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app';
import { seedChatbotFixtures, SeededChatbotData } from './helpers/chatbotFixtures';
import { getAIServices, setAIServices, resetAIServices } from '../src/services/ai/aiContainer';
import { cosineSimilarity } from '../src/utils/vectorSimilarity';
import ChatbotSession from '../src/models/ChatbotSession';
import NeedsReviewQuery from '../src/models/NeedsReviewQuery';
import QueryClickStats from '../src/models/QueryClickStats';
import { generateToken } from '../src/utils/jwt';

describe('Chatbot Engine Backend — Comprehensive Test Suite (R1-R4)', () => {
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
    resetAIServices();
    fixtures = await seedChatbotFixtures();
  });

  afterEach(async () => {
    resetAIServices();
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  // ==========================================
  // R1: AI Service Abstraction & Mocks
  // ==========================================
  describe('R1: Vendor-Agnostic AI Service Interfaces & Mocks', () => {
    it('should provide deterministic embeddings with 1536 dimensions', async () => {
      const ai = getAIServices();
      expect(ai.embedding.dimensions).toBe(1536);

      const emb1 = await ai.embedding.generateEmbedding('tension headache');
      const emb2 = await ai.embedding.generateEmbedding('tension headache');

      expect(emb1).toHaveLength(1536);
      expect(emb2).toHaveLength(1536);
      expect(emb1).toEqual(emb2);

      // Verify cosine similarity of identical text is 1.0
      const sim = cosineSimilarity(emb1, emb2);
      expect(sim).toBeCloseTo(1.0, 4);
    });

    it('should translate non-English text to English deterministically', async () => {
      const ai = getAIServices();
      const resHindi = await ai.llm.translateToEnglish('मुझे सिरदर्द है');
      expect(resHindi.detectedLanguage).toBe('hi');
      expect(resHindi.translatedText).toBe('I have a headache');

      const resEnglish = await ai.llm.translateToEnglish('I have severe joint pain');
      expect(resEnglish.detectedLanguage).toBe('en');
      expect(resEnglish.translatedText).toBe('I have severe joint pain');
    });

    it('should transcribe audio inputs deterministically via MockSTTService', async () => {
      const ai = getAIServices();
      const base64Audio = Buffer.from('What is the recommended homeopathic treatment for tension headaches?').toString('base64');
      const res = await ai.stt.transcribeAudio(base64Audio);
      expect(res.text).toBe('What is the recommended homeopathic treatment for tension headaches?');
    });

    it('should synthesize speech via MockTTSService returning audio buffer', async () => {
      const ai = getAIServices();
      const res = await ai.tts.synthesizeSpeech('Belladonna 30C is recommended');
      expect(res.audioBuffer).toBeDefined();
      expect(res.mimeType).toBe('audio/mpeg');
    });

    it('should allow swappable dependency injection via setAIServices and resetAIServices', async () => {
      const customLLM = {
        translateToEnglish: jest.fn().mockResolvedValue({ translatedText: 'custom translated', detectedLanguage: 'fr' }),
        generateAnswer: jest.fn().mockResolvedValue('custom answer'),
        generatePersonalizedAnswer: jest.fn().mockResolvedValue('custom personalized'),
      };

      setAIServices({ llm: customLLM });
      const currentAI = getAIServices();
      const result = await currentAI.llm.translateToEnglish('bonjour');
      expect(result.translatedText).toBe('custom translated');
      expect(customLLM.translateToEnglish).toHaveBeenCalledWith('bonjour');

      resetAIServices();
      const restoredAI = getAIServices();
      const restoredResult = await restoredAI.llm.translateToEnglish('I have a headache');
      expect(restoredResult.translatedText).toBe('I have a headache');
    });
  });

  // ==========================================
  // R2: Query Pipeline — Direct Answer Flow
  // ==========================================
  describe('R2: Direct Answer Query Pipeline', () => {
    it('should return a confident direct answer when query matches Level 1 Question', async () => {
      const res = await request(app)
        .post('/chatbot/query')
        .send({
          text: 'What is the recommended homeopathic treatment for tension headaches?',
          intent: 'direct_answer',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.matchConfident).toBe(true);
      expect(res.body.confidenceScore).toBeGreaterThanOrEqual(0.75);
      expect(res.body.sessionId).toBeDefined();
      expect(res.body.matchedLevel1Question.id).toBe(fixtures.headacheQuestion._id.toString());
      expect(res.body.answer).toBeDefined();
      expect(res.body.answer.answerText).toContain('Belladonna 30C');
      expect(res.body.answer.dosageInstructions).toContain('Take 4 pellets');
      expect(res.body.answer.homeRemedyText).toBeDefined();
      expect(res.body.answer.safetyDisclaimerText).toBeDefined();

      // Verify candidates list contains top matches with score
      expect(res.body.matchCandidates).toBeInstanceOf(Array);
      expect(res.body.matchCandidates.length).toBeGreaterThanOrEqual(1);
      expect(res.body.matchCandidates[0].level1QuestionId).toBe(fixtures.headacheQuestion._id.toString());
      expect(res.body.matchCandidates[0].score).toBeGreaterThanOrEqual(0.75);

      // Verify ChatbotSession in MongoDB
      const session = await ChatbotSession.findById(res.body.sessionId);
      expect(session).not.toBeNull();
      expect(session!.matchConfident).toBe(true);
      expect(session!.intent).toBe('direct_answer');
      expect(session!.matchedLevel1QuestionId!.toString()).toBe(fixtures.headacheQuestion._id.toString());
      expect(session!.finalAnswerId!.toString()).toBe(fixtures.headacheAnswer._id.toString());
      expect(session!.matchCandidates.length).toBeGreaterThanOrEqual(1);

      // Verify QueryClickStats incremented
      const stats = await QueryClickStats.findOne({ level1QuestionId: fixtures.headacheQuestion._id });
      expect(stats).not.toBeNull();
      expect(stats!.clickCount).toBe(1);
      expect(stats!.firstAskedAt).toBeDefined();
    });

    it('should atomically increment QueryClickStats on subsequent queries for the same question', async () => {
      // First query
      await request(app)
        .post('/chatbot/query')
        .send({
          text: 'What is the recommended homeopathic treatment for tension headaches?',
          intent: 'direct_answer',
        });

      // Second query
      await request(app)
        .post('/chatbot/query')
        .send({
          text: 'treatment for tension headaches',
          intent: 'direct_answer',
        });

      const stats = await QueryClickStats.findOne({ level1QuestionId: fixtures.headacheQuestion._id });
      expect(stats).not.toBeNull();
      expect(stats!.clickCount).toBe(2);
    });

    it('should work seamlessly under dual-mounted prefix /api/chatbot/query', async () => {
      const res = await request(app)
        .post('/api/chatbot/query')
        .send({
          text: 'What is the recommended homeopathic treatment for tension headaches?',
          intent: 'direct_answer',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.matchConfident).toBe(true);
    });
  });

  // ==========================================
  // R2: Query Pipeline — Consultation Flow
  // ==========================================
  describe('R2: Consultation Diagnostic Questions Flow', () => {
    it('should return diagnostic questions when intent is consultation and match is confident', async () => {
      const res = await request(app)
        .post('/chatbot/query')
        .send({
          text: 'What homeopathic remedies help with acute migraine pain?',
          intent: 'consultation',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.matchConfident).toBe(true);
      expect(res.body.intent).toBe('consultation');
      expect(res.body.matchedLevel1Question.id).toBe(fixtures.migraineQuestion._id.toString());

      // Check diagnostic questions returned
      expect(res.body.diagnosticQuestions).toBeDefined();
      expect(res.body.diagnosticQuestions).toHaveLength(2);
      expect(res.body.diagnosticQuestions[0].id).toBe('q1');
      expect(res.body.diagnosticQuestions[0].questionText).toContain('throbbing or pulsating');
      expect(res.body.diagnosticQuestions[1].id).toBe('q2');

      // Check consultation object contract
      expect(res.body.consultation).toBeDefined();
      expect(res.body.consultation.diagnosticQuestions).toHaveLength(2);

      // Verify Session in MongoDB
      const session = await ChatbotSession.findById(res.body.sessionId);
      expect(session).not.toBeNull();
      expect(session!.intent).toBe('consultation');
      expect(session!.matchConfident).toBe(true);
      expect(session!.matchedLevel1QuestionId!.toString()).toBe(fixtures.migraineQuestion._id.toString());
      expect(session!.finalAnswerId).toBeUndefined(); // Not answered yet
    });
  });

  // ==========================================
  // R3: Consultation Answer Resolution
  // ==========================================
  describe('R3: Consultation Answer Resolution Endpoint', () => {
    it('should resolve branch 1 (severe migraine) when answers are { q1: yes, q2: yes }', async () => {
      // 1. Initiate consultation query
      const queryRes = await request(app)
        .post('/chatbot/query')
        .send({
          text: 'What homeopathic remedies help with acute migraine pain?',
          intent: 'consultation',
        });
      const sessionId = queryRes.body.sessionId;

      // 2. Submit diagnostic answers
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
      expect(answerRes.body.sessionId).toBe(sessionId);
      expect(answerRes.body.matchedBranch).toBeDefined();
      expect(answerRes.body.matchedBranch.resolvedAnswerId).toBe(fixtures.severeMigraineAnswer._id.toString());
      expect(answerRes.body.answer).toBeDefined();
      expect(answerRes.body.answer.id).toBe(fixtures.severeMigraineAnswer._id.toString());
      expect(answerRes.body.answer.answerText).toContain('Belladonna 200C and Glonoinum');
      expect(answerRes.body.answer.personalizedAnswer).toContain('Personalized Homeopathic Plan');
      expect(answerRes.body.answer.personalizedAnswer).toContain('Belladonna 200C');
      expect(answerRes.body.personalized).toBe(true);

      // Verify session updated in MongoDB
      const updatedSession = await ChatbotSession.findById(sessionId);
      expect(updatedSession).not.toBeNull();
      expect(updatedSession!.finalAnswerId!.toString()).toBe(fixtures.severeMigraineAnswer._id.toString());
      expect(updatedSession!.consultationAnswers).toBeDefined();
      const rawAns: any = updatedSession!.consultationAnswers;
      const q1Val = typeof rawAns.get === 'function' ? rawAns.get('q1') : rawAns.q1;
      const q2Val = typeof rawAns.get === 'function' ? rawAns.get('q2') : rawAns.q2;
      expect(q1Val).toBe('yes');
      expect(q2Val).toBe('yes');
    });

    it('should resolve branch 2 (mild migraine) when answers are { q1: no, q2: no }', async () => {
      const queryRes = await request(app)
        .post('/chatbot/query')
        .send({
          text: 'What homeopathic remedies help with acute migraine pain?',
          intent: 'consultation',
        });
      const sessionId = queryRes.body.sessionId;

      const answerRes = await request(app)
        .post('/chatbot/consultation-answer')
        .send({
          sessionId,
          answers: {
            q1: 'no',
            q2: 'no',
          },
        });

      expect(answerRes.status).toBe(200);
      expect(answerRes.body.success).toBe(true);
      expect(answerRes.body.matchedBranch.resolvedAnswerId).toBe(fixtures.mildMigraineAnswer._id.toString());
      expect(answerRes.body.answer.id).toBe(fixtures.mildMigraineAnswer._id.toString());
      expect(answerRes.body.answer.answerText).toContain('Gelsemium 30C and Kali Phos');

      const updatedSession = await ChatbotSession.findById(sessionId);
      expect(updatedSession!.finalAnswerId!.toString()).toBe(fixtures.mildMigraineAnswer._id.toString());
    });

    it('should work under dual-mounted prefix /api/chatbot/consultation-answer', async () => {
      const queryRes = await request(app)
        .post('/api/chatbot/query')
        .send({
          text: 'What homeopathic remedies help with acute migraine pain?',
          intent: 'consultation',
        });
      const sessionId = queryRes.body.sessionId;

      const answerRes = await request(app)
        .post('/api/chatbot/consultation-answer')
        .send({
          sessionId,
          answers: {
            q1: 'yes',
            q2: 'yes',
          },
        });

      expect(answerRes.status).toBe(200);
      expect(answerRes.body.success).toBe(true);
      expect(answerRes.body.answer.id).toBe(fixtures.severeMigraineAnswer._id.toString());
    });
  });

  // ==========================================
  // R2: Fallback & Needs Review Handling
  // ==========================================
  describe('R2: Fallback & Needs Review Queue for Low Confidence Queries', () => {
    it('should return fallback message and log to needs_review_queries when similarity < threshold', async () => {
      const unrelatedQuery = 'Can you help me invest in corporate bonds and cryptocurrency?';

      const res = await request(app)
        .post('/chatbot/query')
        .send({
          text: unrelatedQuery,
          intent: 'direct_answer',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.matchConfident).toBe(false);
      expect(res.body.fallback).toBe(true);
      expect(res.body.message).toContain('We could not find a confident match');
      expect(res.body.needsReviewId).toBeDefined();
      expect(res.body.sessionId).toBeDefined();

      // Verify ChatbotSession recorded matchConfident: false
      const session = await ChatbotSession.findById(res.body.sessionId);
      expect(session).not.toBeNull();
      expect(session!.matchConfident).toBe(false);
      expect(session!.originalQueryText).toBe(unrelatedQuery);

      // Verify NeedsReviewQuery document in DB
      const needsReview = await NeedsReviewQuery.findById(res.body.needsReviewId);
      expect(needsReview).not.toBeNull();
      expect(needsReview!.originalQueryText).toBe(unrelatedQuery);
      expect(needsReview!.status).toBe('pending');
      expect(needsReview!.sessionId!.toString()).toBe(session!._id.toString());

      // Verify QueryClickStats is NOT incremented for low confidence queries
      const statsCount = await QueryClickStats.countDocuments();
      expect(statsCount).toBe(0);
    });
  });

  // ==========================================
  // R2: Multilingual & Voice Input
  // ==========================================
  describe('R2: Multilingual and Voice Processing', () => {
    it('should process Hindi query via LLM translation to English', async () => {
      const res = await request(app)
        .post('/chatbot/query')
        .send({
          text: 'मुझे सिरदर्द है',
          language: 'hi',
          intent: 'direct_answer',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.matchConfident).toBe(true);
      expect(res.body.matchedLevel1Question.id).toBe(fixtures.headacheQuestion._id.toString());

      // Verify session captured language and original query
      const session = await ChatbotSession.findById(res.body.sessionId);
      expect(session!.originalLanguage).toBe('hi');
      expect(session!.originalQueryText).toBe('मुझे सिरदर्द है');
      expect(session!.translatedQueryText).toBe('I have a headache');
    });

    it('should process voice input with base64 audio via STT transcription', async () => {
      const base64Audio = Buffer.from(
        'What is the recommended homeopathic treatment for tension headaches?'
      ).toString('base64');

      const res = await request(app)
        .post('/chatbot/query')
        .send({
          audio: base64Audio,
          inputMode: 'voice',
          intent: 'direct_answer',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.matchConfident).toBe(true);
      expect(res.body.matchedLevel1Question.id).toBe(fixtures.headacheQuestion._id.toString());

      const session = await ChatbotSession.findById(res.body.sessionId);
      expect(session!.inputMode).toBe('voice');
      expect(session!.originalQueryText).toBe(
        'What is the recommended homeopathic treatment for tension headaches?'
      );
    });
  });

  // ==========================================
  // R4: User Context & Authentication Integration
  // ==========================================
  describe('R4: User Context Integration', () => {
    it('should associate authenticated user JWT with ChatbotSession and QueryClickStats', async () => {
      const token = generateToken({
        userId: fixtures.testUser._id.toString(),
        email: fixtures.testUser.email!,
        authProvider: 'email_otp',
      });

      const res = await request(app)
        .post('/chatbot/query')
        .set('Authorization', `Bearer ${token}`)
        .send({
          text: 'What is the recommended homeopathic treatment for tension headaches?',
          intent: 'direct_answer',
        });

      expect(res.status).toBe(200);
      const session = await ChatbotSession.findById(res.body.sessionId);
      expect(session!.userId!.toString()).toBe(fixtures.testUser._id.toString());

      const stats = await QueryClickStats.findOne({
        level1QuestionId: fixtures.headacheQuestion._id,
        userId: fixtures.testUser._id,
      });
      expect(stats).not.toBeNull();
      expect(stats!.clickCount).toBe(1);
    });

    it('should cleanly partition QueryClickStats between registered users and guest queries without contamination', async () => {
      // Clear previous click stats for clean isolation
      await QueryClickStats.deleteMany({ level1QuestionId: fixtures.headacheQuestion._id });

      const token = generateToken({
        userId: fixtures.testUser._id.toString(),
        email: fixtures.testUser.email!,
        authProvider: 'email_otp',
      });

      // 1. Registered user executes query
      const userRes = await request(app)
        .post('/chatbot/query')
        .set('Authorization', `Bearer ${token}`)
        .send({
          text: 'What is the recommended homeopathic treatment for tension headaches?',
          intent: 'direct_answer',
        });
      expect(userRes.status).toBe(200);

      const userStatsBefore = await QueryClickStats.findOne({
        level1QuestionId: fixtures.headacheQuestion._id,
        userId: fixtures.testUser._id,
      });
      expect(userStatsBefore).not.toBeNull();
      expect(userStatsBefore!.clickCount).toBe(1);

      // 2. Guest user (no token, no userId) executes same query
      const guestRes1 = await request(app)
        .post('/chatbot/query')
        .send({
          text: 'What is the recommended homeopathic treatment for tension headaches?',
          intent: 'direct_answer',
        });
      expect(guestRes1.status).toBe(200);

      // Verify guest stats created with userId: null
      const guestStats1 = await QueryClickStats.findOne({
        level1QuestionId: fixtures.headacheQuestion._id,
        userId: null,
      });
      expect(guestStats1).not.toBeNull();
      expect(guestStats1!.clickCount).toBe(1);

      // Verify registered user's stats were NOT contaminated
      const userStatsAfter1 = await QueryClickStats.findOne({
        level1QuestionId: fixtures.headacheQuestion._id,
        userId: fixtures.testUser._id,
      });
      expect(userStatsAfter1!.clickCount).toBe(1);

      // 3. Second guest user executes same query
      const guestRes2 = await request(app)
        .post('/chatbot/query')
        .send({
          text: 'What is the recommended homeopathic treatment for tension headaches?',
          intent: 'direct_answer',
        });
      expect(guestRes2.status).toBe(200);

      const guestStats2 = await QueryClickStats.findOne({
        level1QuestionId: fixtures.headacheQuestion._id,
        userId: null,
      });
      expect(guestStats2!.clickCount).toBe(2);

      // Verify registered user's record is still strictly 1 click
      const userStatsFinal = await QueryClickStats.findOne({
        level1QuestionId: fixtures.headacheQuestion._id,
        userId: fixtures.testUser._id,
      });
      expect(userStatsFinal!.clickCount).toBe(1);

      // Exactly two records must exist for this question: one for user, one for guest
      const allStats = await QueryClickStats.find({
        level1QuestionId: fixtures.headacheQuestion._id,
      });
      expect(allStats.length).toBe(2);
    });
  });
});
