import mongoose from 'mongoose';
import { getAIServices } from './ai/aiContainer';
import { searchLevel1Questions, ScoredCandidate } from '../utils/vectorSimilarity';
import { getChatbotConfig } from '../config/chatbotConfig';
import ChatbotSession, { IChatbotSession } from '../models/ChatbotSession';
import NeedsReviewQuery from '../models/NeedsReviewQuery';
import QueryClickStats from '../models/QueryClickStats';
import Answer from '../models/Answer';
import ConsultationQuery from '../models/ConsultationQuery';

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
}

export class ChatbotService {
  // Fix 6: Pipeline-level response cache for identical queries
  private pipelineCache: Map<string, { response: ChatbotQueryResponse; cachedAt: number }> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  private getCachedResponse(queryText: string, intent: string): ChatbotQueryResponse | null {
    const key = `${queryText.toLowerCase().trim()}::${intent}`;
    const cached = this.pipelineCache.get(key);
    if (cached && (Date.now() - cached.cachedAt) < this.CACHE_TTL_MS) {
      return cached.response;
    }
    if (cached) this.pipelineCache.delete(key);
    return null;
  }

  private setCachedResponse(queryText: string, intent: string, response: ChatbotQueryResponse): void {
    const key = `${queryText.toLowerCase().trim()}::${intent}`;
    this.pipelineCache.set(key, { response, cachedAt: Date.now() });
    // Evict old entries if cache grows too large
    if (this.pipelineCache.size > 500) {
      const firstKey = this.pipelineCache.keys().next().value;
      if (firstKey) this.pipelineCache.delete(firstKey);
    }
  }

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

    if (!originalQueryText) {
      throw new Error('Query text or voiceData is required');
    }

    // Fix 6: Check pipeline cache first — instant response for repeat queries
    const cachedResponse = this.getCachedResponse(originalQueryText, input.intent);
    if (cachedResponse) {
      // Fire session save in background (don't block the response)
      const session = new ChatbotSession({
        userId: parsedUserId,
        originalQueryText,
        intent: input.intent,
        matchConfident: cachedResponse.matchConfident,
        inputMode,
      });
      session.save().catch((e: any) => console.error('Session save error:', e));
      return { ...cachedResponse, sessionId: session._id.toString() };
    }

    // 3.5 Combined Intent Classification + Translation
    // Fix 1+2+5: Single API call instead of 2 sequential calls.
    // Also skips translation entirely for English text (detected via ASCII heuristic).
    let userIntent: 'MEDICAL' | 'GREETING' | 'CHITCHAT' | 'UNCLEAR';
    let translatedQueryText: string;
    let originalLanguage: string;

    if (ai.llm.classifyAndTranslate) {
      const result = await ai.llm.classifyAndTranslate(originalQueryText, detectedLang);
      userIntent = result.intent;
      translatedQueryText = result.translatedText || originalQueryText;
      originalLanguage = detectedLang || result.detectedLanguage || 'en';
    } else {
      // Fallback to old sequential method for mock services
      userIntent = ai.llm.classifyIntent ? await ai.llm.classifyIntent(originalQueryText) : 'MEDICAL';
      const translation = await ai.llm.translateToEnglish(originalQueryText, detectedLang);
      translatedQueryText = translation.translatedText || originalQueryText;
      originalLanguage = detectedLang || translation.detectedLanguage || 'en';
    }

    if (userIntent === 'GREETING' || userIntent === 'CHITCHAT') {
      // Fast path: skip vector search entirely for casual chat
      const fallbackText = await ai.llm.generateConversationalResponse(originalQueryText, originalLanguage);
      const session = new ChatbotSession({
        userId: parsedUserId,
        originalQueryText,
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
      this.setCachedResponse(originalQueryText, input.intent, response);
      return response;
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
        const answerDoc = await Answer.findOne({ level1QuestionId: topCandidate.level1QuestionId });

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

        let finalAnswerText: string;
        if (answerDoc) {
          finalAnswerText = await ai.llm.generateAnswer(translatedQueryText, {
            canonicalQuestion: topCandidate.canonicalQuestionText,
            baseAnswer: answerDoc.answerText,
            remedy: (answerDoc as any).remedyText || answerDoc.answerText,
            dosageInstructions: answerDoc.dosageInstructions,
            homeRemedyText: answerDoc.homeRemedyText,
            safetyDisclaimerText: answerDoc.safetyDisclaimerText,
            targetLanguage: originalLanguage
          });
        } else {
          finalAnswerText = await ai.llm.generateAnswer(translatedQueryText, { targetLanguage: originalLanguage });
        }

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
          answer: {
            id: answerDoc?._id ? answerDoc._id.toString() : new mongoose.Types.ObjectId().toString(),
            answerText: finalAnswerText,
            remedyName: answerDoc?.remedyText,
            dosageInstructions: answerDoc?.dosageInstructions,
            homeRemedyText: answerDoc?.homeRemedyText,
            safetyDisclaimerText: answerDoc?.safetyDisclaimerText,
            videoUrl: answerDoc?.videoUrl,
          },
          matchCandidates,
        };
        this.setCachedResponse(originalQueryText, input.intent, response);
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
        session.save().catch((e: any) => console.error('Session save error:', e));

        const diagnosticQuestions = consultDoc?.diagnosticQuestions || [];

        return {
          success: true,
          sessionId: session._id.toString(),
          matchConfident: true,
          confidenceScore,
          intent: 'consultation',
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
    this.setCachedResponse(originalQueryText, input.intent, response);
    return response;
  }
}

export const chatbotService = new ChatbotService();
export default chatbotService;
