import mongoose from 'mongoose';
import { getAIServices } from './ai/aiContainer';
import { searchLevel1Questions, ScoredCandidate } from '../utils/vectorSimilarity';
import { getChatbotConfig } from '../config/chatbotConfig';
import ChatbotSession, { IChatbotSession } from '../models/ChatbotSession';
import NeedsReviewQuery from '../models/NeedsReviewQuery';
import QueryClickStats from '../models/QueryClickStats';
import Answer from '../models/Answer';
import ConsultationQuery from '../models/ConsultationQuery';
import { localizeFields, ANSWER_FIELDS } from './localizationService';

export interface ProcessQueryInput {
  text?: string;
  query?: string;
  queryText?: string;
  audio?: string | Buffer;
  voiceData?: string | Buffer;
  mimeType?: string;
  language?: string;
  inputMode?: 'text' | 'voice';
  intent: 'direct_answer' | 'consultation';
  userId?: string | mongoose.Types.ObjectId;
  userEmail?: string;
}

export interface CandidateResult {
  level1QuestionId: string;
  canonicalQuestionText: string;
  score: number;
}

export interface ChatbotQueryResponse {
  success: boolean;
  sessionId: string;
  matchConfident: boolean;
  confidenceScore: number;
  intent: 'direct_answer' | 'consultation';
  matchedLevel1Question?: {
    id: string;
    canonicalQuestionText: string;
  };
  answer?: {
    id: string;
    answerText: string;
    remedyName?: string;
    dosageInstructions?: string;
    homeRemedyText?: string;
    safetyDisclaimerText?: string;
    videoUrl?: string;
  };
  consultation?: {
    consultationQueryId: string;
    diagnosticQuestions: Array<{ id: string; questionText: string }>;
  };
  diagnosticQuestions?: Array<{ id: string; questionText: string }>;
  fallback?: boolean;
  message?: string;
  needsReviewId?: string;
  matchCandidates: CandidateResult[];
  language?: string;
}

const queryCache = new Map<string, { expiresAt: number; response: ChatbotQueryResponse }>();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

export class ChatbotService {
  /**
   * Resolves a user health query through speech transcription (if voice),
   * combined intent classification + translation (single API call),
   * dense vector embedding, cosine similarity ranking,
   * threshold evaluation, and branching into direct answers or consultation diagnostic questions.
   */
  public async processQuery(input: ProcessQueryInput): Promise<ChatbotQueryResponse> {
    const config = getChatbotConfig();
    const ai = getAIServices();

    // 1. Validate Intent
    if (!input.intent || (input.intent !== 'direct_answer' && input.intent !== 'consultation')) {
      throw new Error("Intent must be either 'direct_answer' or 'consultation'");
    }

    // 2. Determine Input Mode & Validate Input Payload
    const rawAudio = input.audio || input.voiceData;
    const rawText = input.text || input.query || input.queryText;

    let inputMode: 'text' | 'voice' = input.inputMode || (rawAudio && !rawText ? 'voice' : 'text');

    if (inputMode === 'voice') {
      if (!rawAudio || (typeof rawAudio === 'string' && rawAudio.trim().length === 0)) {
        throw new Error("voiceData is required when inputMode is 'voice'");
      }
    } else {
      if (!rawText || (typeof rawText === 'string' && rawText.trim().length === 0)) {
        throw new Error('Query text or voiceData is required');
      }
    }

    // 3. Audio Transcription (if voice mode)
    let parsedUserId: mongoose.Types.ObjectId | undefined = undefined;
    if (input.userId && mongoose.Types.ObjectId.isValid(input.userId.toString())) {
      parsedUserId = new mongoose.Types.ObjectId(input.userId.toString());
    }
    let originalQueryText = '';
    let detectedLang = input.language;

    if (inputMode === 'voice' && rawAudio) {
      const transcription = await ai.stt.transcribeAudio(rawAudio, input.mimeType);
      originalQueryText = (transcription.text || '').trim();
      detectedLang = detectedLang || transcription.language;
    } else {
      originalQueryText = (rawText as string).trim();
    }

    if (inputMode === 'text' && input.intent === 'direct_answer' && originalQueryText) {
      const cacheKey = originalQueryText.trim().toLowerCase();
      const cached = queryCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        console.log(`[ChatbotService] Cache hit`);
        return cached.response;
      }
    }
    if (!originalQueryText) {
      throw new Error('Query text or voiceData is required');
    }

    // Detect language and translate in one cached call. Do not infer English from
    // Latin letters: romanized Indian languages use the same characters.
    let userIntent: 'MEDICAL' | 'GREETING' | 'CHITCHAT' | 'UNCLEAR';
    let translatedQueryText: string;
    let originalLanguage: string;

    if (ai.llm.classifyAndTranslate) {
      const result = await ai.llm.classifyAndTranslate(originalQueryText, detectedLang);
      userIntent = result.intent;
      translatedQueryText = result.translatedText || originalQueryText;
      originalLanguage = result.detectedLanguage || detectedLang || 'en';
    } else {
      // Fallback to old sequential method for mock services
      userIntent = ai.llm.classifyIntent ? await ai.llm.classifyIntent(originalQueryText) : 'MEDICAL';
      const translation = await ai.llm.translateToEnglish(originalQueryText, detectedLang);
      translatedQueryText = translation.translatedText || originalQueryText;
      originalLanguage = translation.detectedLanguage || detectedLang || 'en';
    }

    if (userIntent === 'GREETING' || userIntent === 'CHITCHAT') {
      // Fast path: skip vector search entirely for casual chat
      const fallbackText = await ai.llm.generateConversationalResponse(originalQueryText, originalLanguage);
      const session = new ChatbotSession({
        userId: parsedUserId,
        originalQueryText,
        originalLanguage,
        translatedQueryText,
        intent: input.intent,
        matchConfident: false,
        inputMode,
      });
      // Fire in background — don't block
      session.save().catch((e: any) => console.error('Session save error:', e));

      const response: ChatbotQueryResponse = {
        success: true,
        sessionId: session._id.toString(),
        matchConfident: false,
        confidenceScore: 0,
        intent: input.intent,
        fallback: true,
        message: fallbackText,
        matchCandidates: [],
      };
      return { ...response, language: originalLanguage };
    }

    // 5. Generate 1536-dim Embedding
    const queryEmbedding = await ai.embedding.generateEmbedding(translatedQueryText);

    // 6. Vector Similarity Search against Active Level1Questions
    const rawCandidates: ScoredCandidate[] = await searchLevel1Questions(
      queryEmbedding,
      config.topCandidatesCount
    );

    const matchCandidates: CandidateResult[] = rawCandidates.map((c) => ({
      level1QuestionId: c.level1QuestionId.toString(),
      canonicalQuestionText: c.canonicalQuestionText,
      score: c.score,
    }));

    const topCandidate = rawCandidates.length > 0 ? rawCandidates[0] : null;
    const matchConfident = !!(topCandidate && topCandidate.score >= config.matchConfidenceThreshold);
    const confidenceScore = topCandidate ? topCandidate.score : 0;

    // 7. Confident Match Branch
    if (matchConfident && topCandidate) {
      // 7a. Increment Click Statistics — fire in background (don't block)
      QueryClickStats.findOneAndUpdate(
        {
          level1QuestionId: topCandidate.level1QuestionId,
          userId: parsedUserId || null,
        },
        {
          $inc: { clickCount: 1 },
          $setOnInsert: {
            firstAskedAt: new Date(),
            userId: parsedUserId || null,
            ...(input.userEmail ? { userEmail: input.userEmail } : {}),
          },
        },
        { upsert: true, returnDocument: 'after' }
      ).catch((e: any) => console.error('Error updating QueryClickStats:', e));

      // 7b. Direct Answer Intent
      if (input.intent === 'direct_answer') {
        const answerDoc = await Answer.findOne({ level1QuestionId: topCandidate.level1QuestionId, answerType: 'level1' });
        if (!answerDoc) {
          const error: any = new Error('The selected database answer is unavailable. Please retry or contact the clinic.');
          error.statusCode = 404;
          throw error;
        }

        const session = new ChatbotSession({
          userId: parsedUserId,
          originalQueryText,
          originalLanguage,
          translatedQueryText,
          inputMode,
          intent: 'direct_answer',
          matchCandidates: rawCandidates.map((c) => ({
            level1QuestionId: c.level1QuestionId,
            score: c.score,
          })),
          matchedLevel1QuestionId: topCandidate.level1QuestionId,
          matchConfident: true,
          finalAnswerId: answerDoc?._id,
        });
        // Fire in background — don't block
        session.save().catch((e: any) => console.error('Session save error:', e));

        const localizedAnswer = await localizeFields(ai.llm, {
          id: answerDoc._id.toString(), answerText: answerDoc.answerText,
          remedyName: answerDoc.remedyText, dosageInstructions: answerDoc.dosageInstructions,
          homeRemedyText: answerDoc.homeRemedyText, safetyDisclaimerText: answerDoc.safetyDisclaimerText,
          videoUrl: answerDoc.videoUrl,
        }, originalLanguage, ANSWER_FIELDS);

        const response: ChatbotQueryResponse = {
          success: true,
          sessionId: session._id.toString(),
          matchConfident: true,
          confidenceScore,
          intent: 'direct_answer',
          matchedLevel1Question: {
            id: topCandidate.level1QuestionId.toString(),
            canonicalQuestionText: topCandidate.canonicalQuestionText,
          },
          answer: localizedAnswer,
          language: originalLanguage,
          matchCandidates,
        };
        if (inputMode === 'text' && input.intent === 'direct_answer') {
          queryCache.set(originalQueryText.toLowerCase().trim(), {
            expiresAt: Date.now() + CACHE_TTL_MS,
            response
          });
          // To prevent infinite growth
          if (queryCache.size > 1000) {
            queryCache.delete(queryCache.keys().next().value!);
          }
        }
        return response;
      }

      // 7c. Consultation Intent
      if (input.intent === 'consultation') {
        const consultDoc = await ConsultationQuery.findOne({
          level1QuestionId: topCandidate.level1QuestionId,
        });

        const session = new ChatbotSession({
          userId: parsedUserId,
          originalQueryText,
          originalLanguage,
          translatedQueryText,
          inputMode,
          intent: 'consultation',
          matchCandidates: rawCandidates.map((c) => ({
            level1QuestionId: c.level1QuestionId,
            score: c.score,
          })),
          matchedLevel1QuestionId: topCandidate.level1QuestionId,
          matchConfident: true,
        });
        const sourceQuestions = consultDoc?.diagnosticQuestions || [];
        const questionFields = Object.fromEntries(sourceQuestions.map((q, i) => [`question_${i}`, q.questionText]));
        // Save the session while localizing questions, but finish both before returning
        // a session ID the client can submit answers against.
        const [, translatedQuestions] = await Promise.all([
          session.save(), localizeFields(ai.llm, questionFields, originalLanguage, Object.keys(questionFields))
        ]);
        const diagnosticQuestions = sourceQuestions.map((q, i) => ({ id: q.id, questionText: translatedQuestions[`question_${i}`] }));

        return {
          success: true,
          sessionId: session._id.toString(),
          matchConfident: true,
          confidenceScore,
          intent: 'consultation',
          language: originalLanguage,
          matchedLevel1Question: {
            id: topCandidate.level1QuestionId.toString(),
            canonicalQuestionText: topCandidate.canonicalQuestionText,
          },
          consultation: {
            consultationQueryId: consultDoc?._id ? consultDoc._id.toString() : new mongoose.Types.ObjectId().toString(),
            diagnosticQuestions,
          },
          diagnosticQuestions,
          matchCandidates,
        };
      }
    }

    // 8. Low Confidence / Fallback Branch
    const session = new ChatbotSession({
      userId: parsedUserId,
      originalQueryText,
      originalLanguage,
      translatedQueryText,
      inputMode,
      intent: input.intent,
      matchCandidates: rawCandidates.map((c) => ({
        level1QuestionId: c.level1QuestionId,
        score: c.score,
      })),
      matchConfident: false,
    });
    // Fire in background
    session.save().catch((e: any) => console.error('Session save error:', e));

    const needsReview = new NeedsReviewQuery({
      originalQueryText,
      originalLanguage,
      translatedQueryText,
      userId: parsedUserId,
      sessionId: session._id,
      status: 'pending',
    });
    needsReview.save().catch((e: any) => console.error('NeedsReview save error:', e));

    // Use the conversational LLM to generate a friendly, human response.
    let fallbackText: string;
    try {
      fallbackText = await ai.llm.generateConversationalResponse(originalQueryText, originalLanguage);
    } catch (e) {
      console.error("Conversational LLM failed, using minimal fallback", e);
      fallbackText = "I am currently unable to process your request. Please try again later.";
    }

    const response: ChatbotQueryResponse = {
      success: true,
      sessionId: session._id.toString(),
      matchConfident: false,
      confidenceScore,
      intent: input.intent,
      fallback: true,
      message: fallbackText,
      needsReviewId: needsReview._id.toString(),
      matchCandidates,
      answer: {
        id: new mongoose.Types.ObjectId().toString(),
        answerText: fallbackText,
      }
    };
    return { ...response, language: originalLanguage };
  }
}

export const chatbotService = new ChatbotService();
export default chatbotService;
