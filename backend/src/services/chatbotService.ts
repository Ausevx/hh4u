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
  /**
   * Resolves a user health query through speech transcription (if voice),
   * translation to canonical English, dense vector embedding, cosine similarity ranking,
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

    // 4. Multilingual Translation to English
    const translation = await ai.llm.translateToEnglish(originalQueryText, detectedLang);
    const translatedQueryText = translation.translatedText || originalQueryText;
    const originalLanguage = detectedLang || translation.detectedLanguage || 'en';

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

    // Convert userId to ObjectId if valid string
    let parsedUserId: mongoose.Types.ObjectId | undefined = undefined;
    if (input.userId && mongoose.Types.ObjectId.isValid(input.userId.toString())) {
      parsedUserId = new mongoose.Types.ObjectId(input.userId.toString());
    }

    // 7. Confident Match Branch
    if (matchConfident && topCandidate) {
      // 7a. Increment Click Statistics Atomically
      try {
        const statsFilter: any = {
          level1QuestionId: topCandidate.level1QuestionId,
          userId: parsedUserId || null,
        };

        await QueryClickStats.findOneAndUpdate(
          statsFilter,
          {
            $inc: { clickCount: 1 },
            $setOnInsert: {
              firstAskedAt: new Date(),
              userId: parsedUserId || null,
              ...(input.userEmail ? { userEmail: input.userEmail } : {}),
            },
          },
          { upsert: true, returnDocument: 'after' }
        );
      } catch (statsError) {
        // Analytics tracking failure should never block the query response
        console.error('Error updating QueryClickStats:', statsError);
      }

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
        await session.save();

        let finalAnswerText: string;
        if (answerDoc) {
          finalAnswerText = await ai.llm.generateAnswer(translatedQueryText, {
            canonicalQuestion: topCandidate.canonicalQuestionText,
            baseAnswer: answerDoc.answerText,
            remedy: (answerDoc as any).remedyText || answerDoc.answerText,
            dosageInstructions: answerDoc.dosageInstructions,
            homeRemedyText: answerDoc.homeRemedyText,
            safetyDisclaimerText: answerDoc.safetyDisclaimerText,
          });
        } else {
          finalAnswerText = await ai.llm.generateAnswer(translatedQueryText);
        }

        return {
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
            dosageInstructions: answerDoc?.dosageInstructions,
            homeRemedyText: answerDoc?.homeRemedyText,
            safetyDisclaimerText: answerDoc?.safetyDisclaimerText,
            videoUrl: answerDoc?.videoUrl,
          },
          matchCandidates,
        };
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
        await session.save();

        const diagnosticQuestions = consultDoc?.diagnosticQuestions || [
          { id: 'q1', questionText: 'Is the symptom acute and throbbing?' },
          { id: 'q2', questionText: 'Is there accompanying nausea or light sensitivity?' },
        ];

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
    await session.save();

    const needsReview = new NeedsReviewQuery({
      originalQueryText,
      originalLanguage,
      translatedQueryText,
      userId: parsedUserId,
      sessionId: session._id,
      status: 'pending',
    });
    await needsReview.save();
    
    // Instead of a hardcoded fallback message, let the LLM generate a conversational response 
    // explaining that we couldn't find a specific homeopathic remedy for their query.
    let fallbackText = config.fallbackMessage;
    if (input.intent === 'direct_answer') {
      try {
        fallbackText = await ai.llm.generateAnswer(translatedQueryText, {
          canonicalQuestion: "None (Fallback)",
          baseAnswer: "I could not find a specific homeopathic remedy for your query in my database. Please clarify your symptoms or consult a doctor.",
          remedy: "None",
        });
      } catch (e) {
        console.error("Fallback LLM failed", e);
      }
      
      return {
        success: true,
        sessionId: session._id.toString(),
        matchConfident: false,
        confidenceScore,
        intent: 'direct_answer',
        fallback: true,
        message: "Fallback generated",
        needsReviewId: needsReview._id.toString(),
        matchCandidates,
        answer: {
          id: new mongoose.Types.ObjectId().toString(),
          answerText: fallbackText,
        }
      };
    }

    return {
      success: true,
      sessionId: session._id.toString(),
      matchConfident: false,
      confidenceScore,
      intent: input.intent,
      fallback: true,
      message: config.fallbackMessage,
      needsReviewId: needsReview._id.toString(),
      matchCandidates,
    };
  }
}

export const chatbotService = new ChatbotService();
export default chatbotService;
