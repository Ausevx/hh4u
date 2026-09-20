import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app';
import { seedChatbotFixtures, SeededChatbotData } from './helpers/chatbotFixtures';
import { getAIServices, setAIServices, resetAIServices } from '../src/services/ai/aiContainer';
import Level1Question, { ILevel1Question } from '../src/models/Level1Question';
import Answer, { IAnswer } from '../src/models/Answer';
import ConsultationQuery, { IConsultationQuery } from '../src/models/ConsultationQuery';
import ChatbotSession from '../src/models/ChatbotSession';
import NeedsReviewQuery from '../src/models/NeedsReviewQuery';
import QueryClickStats from '../src/models/QueryClickStats';
import { generateToken } from '../src/utils/jwt';

describe('Chatbot Engine Backend — Challenger 1 Empirical & Adversarial Test Suite', () => {
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
    delete process.env.TOP_CANDIDATES_COUNT;
    resetAIServices();
    fixtures = await seedChatbotFixtures();
  });

  afterEach(async () => {
    delete process.env.MATCH_CONFIDENCE_THRESHOLD;
    delete process.env.TOP_CANDIDATES_COUNT;
    resetAIServices();
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  // =========================================================================
  // Mandate 1: Threshold Boundary Behavior Probing
  // =========================================================================
  describe('Mandate 1: Threshold Boundary Behavior Probing', () => {
    it('empirical boundary test: exact score comparison against MATCH_CONFIDENCE_THRESHOLD', async () => {
      const ai = getAIServices();

      // We synthesize query and target embedding with an exact known dot product.
      // Unit vector e0: [1, 0, 0, ...]
      const queryVec = new Array(1536).fill(0);
      queryVec[0] = 1.0;
      ai.embedding.generateEmbedding = jest.fn().mockResolvedValue(queryVec);

      // Probe 1: Target vector with dot product exactly 0.7500 (threshold default is 0.75)
      const targetVec75 = new Array(1536).fill(0);
      targetVec75[0] = 0.75;
      targetVec75[1] = Math.sqrt(1 - 0.75 * 0.75); // unit vector

      await Level1Question.updateOne(
        { _id: fixtures.headacheQuestion._id },
        { embedding: targetVec75 }
      );

      const res75 = await request(app)
        .post('/chatbot/query')
        .send({ text: 'threshold exact 0.75 test', intent: 'direct_answer' });

      expect(res75.status).toBe(200);
      expect(res75.body.confidenceScore).toBe(0.75);
      expect(res75.body.matchConfident).toBe(true);
      expect(res75.body.fallback).toBeUndefined();
      expect(res75.body.answer).toBeDefined();

      // Ensure no NeedsReviewQuery was created for 0.75
      const needsReview75 = await NeedsReviewQuery.findOne({ sessionId: res75.body.sessionId });
      expect(needsReview75).toBeNull();

      // Probe 2: Target vector with dot product 0.7499 (just below 0.75)
      const targetVec7499 = new Array(1536).fill(0);
      targetVec7499[0] = 0.7499;
      targetVec7499[1] = Math.sqrt(1 - 0.7499 * 0.7499);

      await Level1Question.updateOne(
        { _id: fixtures.headacheQuestion._id },
        { embedding: targetVec7499 }
      );

      const res7499 = await request(app)
        .post('/chatbot/query')
        .send({ text: 'threshold sub 0.75 test', intent: 'direct_answer' });

      expect(res7499.status).toBe(200);
      expect(res7499.body.confidenceScore).toBe(0.7499);
      expect(res7499.body.matchConfident).toBe(false);
      expect(res7499.body.fallback).toBe(true);
      expect(res7499.body.needsReviewId).toBeDefined();

      // Verify NeedsReviewQuery created
      const needsReview7499 = await NeedsReviewQuery.findById(res7499.body.needsReviewId);
      expect(needsReview7499).not.toBeNull();
      expect(needsReview7499!.status).toBe('pending');
    });

    it('empirical boundary test: dynamically adjusting MATCH_CONFIDENCE_THRESHOLD changes match classification', async () => {
      const ai = getAIServices();

      const queryVec = new Array(1536).fill(0);
      queryVec[0] = 1.0;
      ai.embedding.generateEmbedding = jest.fn().mockResolvedValue(queryVec);

      // Fixed score 0.80
      const targetVec80 = new Array(1536).fill(0);
      targetVec80[0] = 0.80;
      targetVec80[1] = Math.sqrt(1 - 0.80 * 0.80);

      await Level1Question.updateOne(
        { _id: fixtures.headacheQuestion._id },
        { embedding: targetVec80 }
      );

      // Scenario A: Stricter threshold 0.85 -> score 0.80 MUST be fallback
      process.env.MATCH_CONFIDENCE_THRESHOLD = '0.85';
      const resStrict = await request(app)
        .post('/chatbot/query')
        .send({ text: 'score 0.80 under strict threshold 0.85', intent: 'direct_answer' });

      expect(resStrict.body.matchConfident).toBe(false);
      expect(resStrict.body.fallback).toBe(true);
      expect(resStrict.body.needsReviewId).toBeDefined();

      // Scenario B: Relaxed threshold 0.70 -> score 0.80 MUST be confident match
      process.env.MATCH_CONFIDENCE_THRESHOLD = '0.70';
      const resRelaxed = await request(app)
        .post('/chatbot/query')
        .send({ text: 'score 0.80 under relaxed threshold 0.70', intent: 'direct_answer' });

      expect(resRelaxed.body.matchConfident).toBe(true);
      expect(resRelaxed.body.fallback).toBeUndefined();
      expect(resRelaxed.body.answer).toBeDefined();

      // Scenario C: Extreme threshold 1.00 -> score 0.80 MUST be fallback
      process.env.MATCH_CONFIDENCE_THRESHOLD = '1.00';
      const resExtreme1 = await request(app)
        .post('/chatbot/query')
        .send({ text: 'score 0.80 under extreme threshold 1.00', intent: 'direct_answer' });

      expect(resExtreme1.body.matchConfident).toBe(false);
      expect(resExtreme1.body.fallback).toBe(true);

      // Scenario D: Extreme threshold 0.00 -> score 0.80 MUST be confident
      process.env.MATCH_CONFIDENCE_THRESHOLD = '0.00';
      const resExtreme0 = await request(app)
        .post('/chatbot/query')
        .send({ text: 'score 0.80 under zero threshold 0.00', intent: 'direct_answer' });

      expect(resExtreme0.body.matchConfident).toBe(true);
      expect(resExtreme0.body.fallback).toBeUndefined();
    });

    it('empirical boundary test: verify QueryClickStats is incremented ONLY for confident matches and not fallbacks', async () => {
      const ai = getAIServices();
      const queryVec = new Array(1536).fill(0);
      queryVec[0] = 1.0;
      ai.embedding.generateEmbedding = jest.fn().mockResolvedValue(queryVec);

      // Set target embedding to score 0.70
      const targetVec70 = new Array(1536).fill(0);
      targetVec70[0] = 0.70;
      targetVec70[1] = Math.sqrt(1 - 0.70 * 0.70);
      await Level1Question.updateOne(
        { _id: fixtures.headacheQuestion._id },
        { embedding: targetVec70 }
      );

      // Threshold default 0.75 -> score 0.70 fails -> click stats count must remain 0
      await request(app)
        .post('/chatbot/query')
        .send({ text: 'test fallback stats', intent: 'direct_answer' });

      const statsAfterFallback = await QueryClickStats.findOne({ level1QuestionId: fixtures.headacheQuestion._id });
      expect(statsAfterFallback).toBeNull();

      // Now set threshold 0.65 -> score 0.70 succeeds -> click stats must become 1
      process.env.MATCH_CONFIDENCE_THRESHOLD = '0.65';
      await request(app)
        .post('/chatbot/query')
        .send({ text: 'test confident stats', intent: 'direct_answer' });

      const statsAfterConfident = await QueryClickStats.findOne({ level1QuestionId: fixtures.headacheQuestion._id });
      expect(statsAfterConfident).not.toBeNull();
      expect(statsAfterConfident!.clickCount).toBe(1);
    });
  });

  // =========================================================================
  // Mandate 2: Candidate Logging Verification (3-5 Candidates, Non-Null Scores)
  // =========================================================================
  describe('Mandate 2: Candidate Logging Verification', () => {
    it('empirical test: captures exactly top 5 candidates with non-null scores when >5 active questions exist', async () => {
      const ai = getAIServices();

      // Seed 4 additional active questions with distinct embeddings to have 7 total active questions
      for (let i = 1; i <= 4; i++) {
        const vec = new Array(1536).fill(0);
        vec[i] = 1.0; // orthogonal embeddings
        await Level1Question.create({
          canonicalQuestionText: `Additional Active Question ${i}`,
          embedding: vec,
          tags: [`extra_${i}`],
          isActive: true,
          version: 1,
        });
      }

      const totalActive = await Level1Question.countDocuments({ isActive: true });
      expect(totalActive).toBe(7); // 3 fixtures + 4 additional

      const res = await request(app)
        .post('/chatbot/query')
        .send({
          text: 'What is the recommended homeopathic treatment for tension headaches?',
          intent: 'direct_answer',
        });

      expect(res.status).toBe(200);

      // 1. Check HTTP response matchCandidates
      const candidates = res.body.matchCandidates;
      expect(Array.isArray(candidates)).toBe(true);
      expect(candidates).toHaveLength(5); // exactly 5 top candidates

      for (let i = 0; i < candidates.length; i++) {
        const cand = candidates[i];
        expect(typeof cand.level1QuestionId).toBe('string');
        expect(cand.level1QuestionId.length).toBeGreaterThan(0);
        expect(typeof cand.canonicalQuestionText).toBe('string');
        expect(cand.canonicalQuestionText.length).toBeGreaterThan(0);
        // Assert score is a non-null, non-undefined, non-NaN finite number
        expect(cand.score).not.toBeNull();
        expect(cand.score).toBeDefined();
        expect(typeof cand.score).toBe('number');
        expect(isNaN(cand.score)).toBe(false);
        expect(cand.score).toBeGreaterThanOrEqual(0);
        expect(cand.score).toBeLessThanOrEqual(1.0);

        // Verify descending rank order
        if (i > 0) {
          expect(candidates[i - 1].score).toBeGreaterThanOrEqual(cand.score);
        }
      }

      // 2. Check MongoDB ChatbotSession document persistence
      const session = await ChatbotSession.findById(res.body.sessionId);
      expect(session).not.toBeNull();
      expect(session!.matchCandidates).toHaveLength(5);

      session!.matchCandidates.forEach((cand) => {
        expect(cand.level1QuestionId).toBeDefined();
        expect(cand.score).not.toBeNull();
        expect(cand.score).toBeDefined();
        expect(typeof cand.score).toBe('number');
        expect(isNaN(cand.score)).toBe(false);
      });
    });

    it('empirical test: captures exactly 3 candidates when TOP_CANDIDATES_COUNT is configured to 3', async () => {
      process.env.TOP_CANDIDATES_COUNT = '3';

      // Ensure at least 5 active questions exist
      for (let i = 1; i <= 3; i++) {
        const vec = new Array(1536).fill(0);
        vec[i] = 1.0;
        await Level1Question.create({
          canonicalQuestionText: `Configurable TopK Question ${i}`,
          embedding: vec,
          tags: [`topk_${i}`],
          isActive: true,
          version: 1,
        });
      }

      const res = await request(app)
        .post('/chatbot/query')
        .send({
          text: 'What is the recommended homeopathic treatment for tension headaches?',
          intent: 'direct_answer',
        });

      expect(res.status).toBe(200);
      expect(res.body.matchCandidates).toHaveLength(3);

      res.body.matchCandidates.forEach((cand: any) => {
        expect(cand.score).not.toBeNull();
        expect(typeof cand.score).toBe('number');
        expect(cand.level1QuestionId).toBeDefined();
      });

      const session = await ChatbotSession.findById(res.body.sessionId);
      expect(session!.matchCandidates).toHaveLength(3);
    });

    it('empirical test: candidate logging on fallback query ALSO logs top candidates with non-null scores', async () => {
      const res = await request(app)
        .post('/chatbot/query')
        .send({
          text: 'completely unrelated query about high yield municipal bonds and equities',
          intent: 'direct_answer',
        });

      expect(res.status).toBe(200);
      expect(res.body.matchConfident).toBe(false);
      expect(res.body.fallback).toBe(true);

      // HTTP response should carry candidates
      expect(res.body.matchCandidates).toBeInstanceOf(Array);
      expect(res.body.matchCandidates.length).toBeGreaterThanOrEqual(3);
      expect(res.body.matchCandidates.length).toBeLessThanOrEqual(5);

      res.body.matchCandidates.forEach((cand: any) => {
        expect(cand.score).not.toBeNull();
        expect(typeof cand.score).toBe('number');
        expect(isNaN(cand.score)).toBe(false);
      });

      // Database session should store candidates
      const session = await ChatbotSession.findById(res.body.sessionId);
      expect(session).not.toBeNull();
      expect(session!.matchCandidates.length).toBeGreaterThanOrEqual(3);
      session!.matchCandidates.forEach((cand) => {
        expect(cand.score).not.toBeNull();
        expect(typeof cand.score).toBe('number');
      });
    });

    it('empirical test: inactive questions (isActive: false) are NEVER included in candidates', async () => {
      // Inactive question has identical text and high embedding match
      const res = await request(app)
        .post('/chatbot/query')
        .send({
          text: 'Outdated treatment guideline for archived symptoms',
          intent: 'direct_answer',
        });

      expect(res.status).toBe(200);
      const inactiveIdStr = fixtures.inactiveQuestion._id.toString();

      for (const cand of res.body.matchCandidates) {
        expect(cand.level1QuestionId).not.toBe(inactiveIdStr);
      }

      const session = await ChatbotSession.findById(res.body.sessionId);
      for (const cand of session!.matchCandidates) {
        expect(cand.level1QuestionId.toString()).not.toBe(inactiveIdStr);
      }
    });
  });

  // =========================================================================
  // Mandate 3: Multi-Condition Consultation Branch Navigation
  // =========================================================================
  describe('Mandate 3: Multi-Condition Consultation Branch Navigation', () => {
    let multiCondQuestion: ILevel1Question;
    let ansA: IAnswer;
    let ansB: IAnswer;
    let ansC: IAnswer;
    let ansD: IAnswer;
    let multiConsultation: IConsultationQuery;

    beforeEach(async () => {
      const ai = getAIServices();
      const emb = await ai.embedding.generateEmbedding('Complex multi condition respiratory consultation query');

      multiCondQuestion = await Level1Question.create({
        canonicalQuestionText: 'Complex multi condition respiratory consultation query',
        embedding: emb,
        tags: ['respiratory', 'complex'],
        isActive: true,
        version: 1,
      });

      ansA = await Answer.create({
        level1QuestionId: multiCondQuestion._id,
        answerText: 'Remedy A: Arsenicum Album 200C for acute nighttime wheezing with anxiety.',
      });

      ansB = await Answer.create({
        level1QuestionId: multiCondQuestion._id,
        answerText: 'Remedy B: Drosera 30C for spasmodic barking cough worsened after midnight.',
      });

      ansC = await Answer.create({
        level1QuestionId: multiCondQuestion._id,
        answerText: 'Remedy C: Pulsatilla 30C for loose morning cough with thirstlessness.',
      });

      ansD = await Answer.create({
        level1QuestionId: multiCondQuestion._id,
        answerText: 'Remedy D: Antimonium Tart 6C for rattling chest mucus with drowsiness.',
      });

      multiConsultation = await ConsultationQuery.create({
        level1QuestionId: multiCondQuestion._id,
        diagnosticQuestions: [
          { id: 'q1', questionText: 'Is the cough dry and hacking?' },
          { id: 'q2', questionText: 'Does symptoms worsen after midnight?' },
          { id: 'q3', questionText: 'Is there associated shortness of breath?' },
          { id: 'q4', questionText: 'Is there excessive thirst for cold water?' },
        ],
        answerBranches: [
          {
            conditions: { q1: 'yes', q2: 'yes', q3: 'yes', q4: 'yes' },
            resolvedAnswerId: ansA._id,
          },
          {
            conditions: { q1: 'yes', q2: 'yes', q3: 'no', q4: 'no' },
            resolvedAnswerId: ansB._id,
          },
          {
            conditions: { q1: 'no', q2: 'no', q3: 'yes', q4: 'no' },
            resolvedAnswerId: ansC._id,
          },
          {
            conditions: { q1: 'no', q2: 'no', q3: 'no', q4: 'no' },
            resolvedAnswerId: ansD._id,
          },
        ],
      });
    });

    async function initSession(): Promise<string> {
      const res = await request(app)
        .post('/chatbot/query')
        .send({
          text: 'Complex multi condition respiratory consultation query',
          intent: 'consultation',
        });
      expect(res.body.matchConfident).toBe(true);
      expect(res.body.diagnosticQuestions).toHaveLength(4);
      return res.body.sessionId;
    }

    it('accurately resolves 4-condition Branch 1: { q1:yes, q2:yes, q3:yes, q4:yes } -> Remedy A', async () => {
      const sessionId = await initSession();

      const res = await request(app)
        .post('/chatbot/consultation-answer')
        .send({
          sessionId,
          answers: { q1: 'yes', q2: 'yes', q3: 'yes', q4: 'yes' },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.matchedBranch.resolvedAnswerId).toBe(ansA._id.toString());
      expect(res.body.answer.id).toBe(ansA._id.toString());
      expect(res.body.answer.answerText).toContain('Arsenicum Album 200C');
      expect(res.body.answer.personalizedAnswer).toContain('Arsenicum Album 200C');

      const session = await ChatbotSession.findById(sessionId);
      expect(session!.finalAnswerId!.toString()).toBe(ansA._id.toString());
    });

    it('accurately resolves 4-condition Branch 2: { q1:yes, q2:yes, q3:no, q4:no } -> Remedy B', async () => {
      const sessionId = await initSession();

      const res = await request(app)
        .post('/chatbot/consultation-answer')
        .send({
          sessionId,
          answers: { q1: 'yes', q2: 'yes', q3: 'no', q4: 'no' },
        });

      expect(res.status).toBe(200);
      expect(res.body.matchedBranch.resolvedAnswerId).toBe(ansB._id.toString());
      expect(res.body.answer.id).toBe(ansB._id.toString());
      expect(res.body.answer.answerText).toContain('Drosera 30C');
    });

    it('accurately resolves 4-condition Branch 3: { q1:no, q2:no, q3:yes, q4:no } -> Remedy C', async () => {
      const sessionId = await initSession();

      const res = await request(app)
        .post('/chatbot/consultation-answer')
        .send({
          sessionId,
          answers: { q1: 'no', q2: 'no', q3: 'yes', q4: 'no' },
        });

      expect(res.status).toBe(200);
      expect(res.body.matchedBranch.resolvedAnswerId).toBe(ansC._id.toString());
      expect(res.body.answer.id).toBe(ansC._id.toString());
      expect(res.body.answer.answerText).toContain('Pulsatilla 30C');
    });

    it('accurately resolves 4-condition Branch 4: { q1:no, q2:no, q3:no, q4:no } -> Remedy D', async () => {
      const sessionId = await initSession();

      const res = await request(app)
        .post('/chatbot/consultation-answer')
        .send({
          sessionId,
          answers: { q1: 'no', q2: 'no', q3: 'no', q4: 'no' },
        });

      expect(res.status).toBe(200);
      expect(res.body.matchedBranch.resolvedAnswerId).toBe(ansD._id.toString());
      expect(res.body.answer.id).toBe(ansD._id.toString());
      expect(res.body.answer.answerText).toContain('Antimonium Tart 6C');
    });

    it('handles reversed answer keys and uppercase values seamlessly', async () => {
      const sessionId = await initSession();

      // Submit Branch 2 answers with reversed keys and uppercase strings
      const res = await request(app)
        .post('/chatbot/consultation-answer')
        .send({
          sessionId,
          answers: { q4: 'NO', q3: 'NO', q2: 'YES', q1: 'YES' },
        });

      expect(res.status).toBe(200);
      expect(res.body.matchedBranch.resolvedAnswerId).toBe(ansB._id.toString());
      expect(res.body.answer.id).toBe(ansB._id.toString());
      expect(res.body.answer.answerText).toContain('Drosera 30C');
    });

    it('accepts answers as an array of questionId/answer objects', async () => {
      const sessionId = await initSession();

      const res = await request(app)
        .post('/chatbot/consultation-answer')
        .send({
          sessionId,
          answers: [
            { questionId: 'q1', answer: 'no' },
            { questionId: 'q2', answer: 'no' },
            { questionId: 'q3', answer: 'yes' },
            { questionId: 'q4', answer: 'no' },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.matchedBranch.resolvedAnswerId).toBe(ansC._id.toString());
      expect(res.body.answer.answerText).toContain('Pulsatilla 30C');
    });
  });

  // =========================================================================
  // Mandate 4: Fallback Questions Saved to needs_review_queries with pending
  // =========================================================================
  describe('Mandate 4: Fallback Questions Saved to needs_review_queries with pending', () => {
    it('creates NeedsReviewQuery with pending status and valid link to ChatbotSession for guest query', async () => {
      const rawText = 'I am asking an uncatalogued symptom about numbness in outer toes';

      const res = await request(app)
        .post('/chatbot/query')
        .send({
          text: rawText,
          intent: 'direct_answer',
        });

      expect(res.status).toBe(200);
      expect(res.body.matchConfident).toBe(false);
      expect(res.body.fallback).toBe(true);
      expect(res.body.needsReviewId).toBeDefined();

      const needsReview = await NeedsReviewQuery.findById(res.body.needsReviewId);
      expect(needsReview).not.toBeNull();
      expect(needsReview!.status).toBe('pending');
      expect(needsReview!.originalQueryText).toBe(rawText);
      expect(needsReview!.translatedQueryText).toBe(rawText);
      expect(needsReview!.originalLanguage).toBe('en');
      expect(needsReview!.sessionId!.toString()).toBe(res.body.sessionId);
      expect(needsReview!.userId).toBeUndefined();
      expect(needsReview!.createdAt).toBeInstanceOf(Date);
    });

    it('creates NeedsReviewQuery capturing authenticated userId when user token is present', async () => {
      const token = generateToken({
        userId: fixtures.testUser._id.toString(),
        email: fixtures.testUser.email!,
        authProvider: 'email_otp',
      });

      const rawText = 'Uncatalogued rare symptoms asked by authenticated user';

      const res = await request(app)
        .post('/chatbot/query')
        .set('Authorization', `Bearer ${token}`)
        .send({
          text: rawText,
          intent: 'direct_answer',
        });

      expect(res.status).toBe(200);
      expect(res.body.matchConfident).toBe(false);

      const needsReview = await NeedsReviewQuery.findById(res.body.needsReviewId);
      expect(needsReview).not.toBeNull();
      expect(needsReview!.status).toBe('pending');
      expect(needsReview!.userId!.toString()).toBe(fixtures.testUser._id.toString());
      expect(needsReview!.sessionId!.toString()).toBe(res.body.sessionId);
    });

    it('creates NeedsReviewQuery with original non-English text and language code for Hindi fallback', async () => {
      const hindiQuery = 'क्या आप मुझे अज्ञात बीमारी का इलाज बता सकते हैं';

      const res = await request(app)
        .post('/chatbot/query')
        .send({
          text: hindiQuery,
          language: 'hi',
          intent: 'direct_answer',
        });

      expect(res.status).toBe(200);
      expect(res.body.matchConfident).toBe(false);
      expect(res.body.fallback).toBe(true);

      const needsReview = await NeedsReviewQuery.findById(res.body.needsReviewId);
      expect(needsReview).not.toBeNull();
      expect(needsReview!.status).toBe('pending');
      expect(needsReview!.originalQueryText).toBe(hindiQuery);
      expect(needsReview!.originalLanguage).toBe('hi');
      expect(needsReview!.translatedQueryText).toBeDefined();
      expect(needsReview!.sessionId!.toString()).toBe(res.body.sessionId);
    });
  });

  // =========================================================================
  // Mandate 5: Concurrency, Inactive Filtering & Stress Probes
  // =========================================================================
  describe('Mandate 5: Concurrency and Resilience Edge Cases', () => {
    it('concurrent queries to the same question atomically increment QueryClickStats without loss', async () => {
      const numQueries = 5;
      const promises = [];

      for (let i = 0; i < numQueries; i++) {
        promises.push(
          request(app)
            .post('/chatbot/query')
            .send({
              text: 'What is the recommended homeopathic treatment for tension headaches?',
              intent: 'direct_answer',
            })
        );
      }

      const results = await Promise.all(promises);
      results.forEach((r) => expect(r.status).toBe(200));

      const stats = await QueryClickStats.findOne({ level1QuestionId: fixtures.headacheQuestion._id });
      expect(stats).not.toBeNull();
      // Atomic $inc: { clickCount: 1 } across 5 concurrent requests must yield 5
      expect(stats!.clickCount).toBe(numQueries);
    });

    it('large query payload (5000 characters) is processed without crashing or memory overflow', async () => {
      const largeText = 'headache '.repeat(500); // 4500 chars

      const res = await request(app)
        .post('/chatbot/query')
        .send({
          text: largeText,
          intent: 'direct_answer',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.sessionId).toBeDefined();
    });

    it('resilient against questions with missing or malformed embeddings in DB', async () => {
      // Question with empty embedding array
      await Level1Question.create({
        canonicalQuestionText: 'Broken question without embedding',
        embedding: [],
        tags: ['broken'],
        isActive: true,
        version: 1,
      });

      const res = await request(app)
        .post('/chatbot/query')
        .send({
          text: 'What is the recommended homeopathic treatment for tension headaches?',
          intent: 'direct_answer',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Ensure the broken question was safely skipped without throwing NaN
      for (const cand of res.body.matchCandidates) {
        expect(isNaN(cand.score)).toBe(false);
      }
    });
  });
});
