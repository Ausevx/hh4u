import mongoose from 'mongoose';
import ChatbotSession from '../models/ChatbotSession';
import ConsultationQuery, { IAnswerBranch } from '../models/ConsultationQuery';
import Answer, { IAnswer } from '../models/Answer';
import { getAIServices } from './ai/aiContainer';
import { localizeFields, ANSWER_FIELDS } from './localizationService';

export interface ResolveConsultationInput {
  sessionId: string;
  answers: Record<string, string> | Map<string, string> | Array<{ questionId?: string; id?: string; answer: string }>;
  consultationAnswers?: Record<string, string> | Map<string, string> | Array<{ questionId?: string; id?: string; answer: string }>;
}

export interface ConsultationResolutionResponse {
  success: boolean;
  sessionId: string;
  matchedBranch?: {
    conditions: Record<string, string>;
    resolvedAnswerId?: string;
  };
  answer: {
    id: string;
    answerText: string;
    personalizedAnswer: string;
    remedyName?: string;
    dosageInstructions?: string;
    homeRemedyText?: string;
    safetyDisclaimerText?: string;
    videoUrl?: string;
  };
  personalized: boolean;
  language?: string;
}

export class ConsultationService {
  /**
   * Evaluates submitted diagnostic Yes/No answers against consultation answer branches,
   * resolves the matching homeopathic answer, generates a personalized synthesized answer,
   * and updates the session with answers and resolved answer ID.
   */
  public async resolveConsultationAnswer(input: ResolveConsultationInput): Promise<ConsultationResolutionResponse> {
    // 1. Validate Session ID
    const sessionId = input.sessionId;
    if (!sessionId) {
      throw new Error('sessionId is required');
    }
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      throw new Error('Invalid sessionId format');
    }

    // 2. Validate & Normalize Answers
    const rawAnswers = input.answers || input.consultationAnswers;
    if (!rawAnswers) {
      throw new Error('answers map is required');
    }

    const normalizedAnswers: Record<string, 'yes' | 'no'> = {};

    if (Array.isArray(rawAnswers)) {
      if (rawAnswers.length === 0) {
        throw new Error('answers map is required');
      }
      for (const item of rawAnswers) {
        const qId = item.questionId || item.id;
        if (!qId) {
          throw new Error('Each answer entry must have a questionId');
        }
        const val = (item.answer || '').toString().toLowerCase().trim();
        if (val !== 'yes' && val !== 'no') {
          throw new Error(`Invalid answer value for question "${qId}". Must be 'yes' or 'no'`);
        }
        normalizedAnswers[qId] = val;
      }
    } else if (rawAnswers instanceof Map || typeof (rawAnswers as any).get === 'function') {
      const map = rawAnswers as Map<string, any>;
      if (map.size === 0) {
        throw new Error('answers map is required');
      }
      for (const [key, val] of map.entries()) {
        const strVal = (val || '').toString().toLowerCase().trim();
        if (strVal !== 'yes' && strVal !== 'no') {
          throw new Error(`Invalid answer value for question "${key}". Must be 'yes' or 'no'`);
        }
        normalizedAnswers[key] = strVal as 'yes' | 'no';
      }
    } else if (typeof rawAnswers === 'object') {
      const entries = Object.entries(rawAnswers);
      if (entries.length === 0) {
        throw new Error('answers map is required');
      }
      for (const [key, val] of entries) {
        const strVal = (val || '').toString().toLowerCase().trim();
        if (strVal !== 'yes' && strVal !== 'no') {
          throw new Error(`Invalid answer value for question "${key}". Must be 'yes' or 'no'`);
        }
        normalizedAnswers[key] = strVal as 'yes' | 'no';
      }
    } else {
      throw new Error('answers must be an object or map');
    }

    // 3. Retrieve ChatbotSession
    const session = await ChatbotSession.findById(sessionId);
    if (!session) {
      const notFoundErr: any = new Error('Session not found');
      notFoundErr.statusCode = 404;
      throw notFoundErr;
    }

    if (session.intent !== 'consultation' || !session.matchConfident || !session.matchedLevel1QuestionId) {
      const badStateErr: any = new Error('Session does not have a confident consultation match');
      badStateErr.statusCode = 400;
      throw badStateErr;
    }

    // 4. Retrieve ConsultationQuery
    const consultDoc = await ConsultationQuery.findOne({
      level1QuestionId: session.matchedLevel1QuestionId,
    });

    const expectedIds = new Set((consultDoc?.diagnosticQuestions || []).map(q => q.id));
    if (expectedIds.size === 0 || Object.keys(normalizedAnswers).length !== expectedIds.size ||
        Object.keys(normalizedAnswers).some(id => !expectedIds.has(id))) {
      const error: any = new Error('Answer every diagnostic question using the question IDs from this consultation.');
      error.statusCode = 400;
      throw error;
    }

    // 5. Evaluate Answer Branches
    let matchedBranch: IAnswerBranch | null = null;

    if (consultDoc?.answerBranches && consultDoc.answerBranches.length > 0) {
      for (const branch of consultDoc.answerBranches) {
        const conditions = branch.conditions;
        let branchKeys: string[] = [];

        if (conditions instanceof Map || typeof (conditions as any).get === 'function') {
          branchKeys = Array.from((conditions as any).keys());
        } else if (conditions && typeof conditions === 'object') {
          branchKeys = Object.keys(conditions);
        }

        if (branchKeys.length === 0) continue;

        const allMatch = branchKeys.every((key) => {
          let expectedVal = '';
          if (conditions instanceof Map || typeof (conditions as any).get === 'function') {
            expectedVal = ((conditions as any).get(key) || '').toString().toLowerCase().trim();
          } else {
            expectedVal = ((conditions as any)[key] || '').toString().toLowerCase().trim();
          }
          const userVal = normalizedAnswers[key];
          return expectedVal === userVal;
        });

        if (allMatch) {
          matchedBranch = branch;
          break;
        }
      }


    }

    if (!matchedBranch?.resolvedAnswerId) {
      const error: any = new Error('No consultation answer matches these responses. Please consult the clinic.');
      error.statusCode = 422;
      throw error;
    }

    // 6. Fetch Resolved Answer Document
    let answerDoc: IAnswer | null = null;

    if (matchedBranch?.resolvedAnswerId) {
      answerDoc = await Answer.findById(matchedBranch.resolvedAnswerId);
    }

    if (!answerDoc) {
      const error: any = new Error('The matched consultation answer is unavailable. Please consult the clinic.');
      error.statusCode = 422;
      throw error;
    }

    const templateText =
      answerDoc?.answerText ||
      `Clinical homeopathic evaluation and individualized guidance for query: "${session.originalQueryText}".`;

    // 8. Update ChatbotSession
    session.consultationAnswers = normalizedAnswers;
    if (answerDoc?._id) {
      session.finalAnswerId = answerDoc._id;
    }
    const language = session.originalLanguage || 'en';
    // Use the saved language rather than detecting again at the answer stage.
    // One content-keyed translation batch is reusable across users of this branch.
    const [, localizedAnswer] = await Promise.all([
      session.save(),
      localizeFields(getAIServices().llm, {
        id: answerDoc._id.toString(), answerText: templateText,
        remedyName: answerDoc.remedyText, dosageInstructions: answerDoc.dosageInstructions,
        homeRemedyText: answerDoc.homeRemedyText, safetyDisclaimerText: answerDoc.safetyDisclaimerText,
        videoUrl: answerDoc.videoUrl,
      }, language, ANSWER_FIELDS),
    ]);

    // Format conditions for response
    let formattedConditions: Record<string, string> = {};
    if (matchedBranch?.conditions) {
      if (matchedBranch.conditions instanceof Map || typeof (matchedBranch.conditions as any).get === 'function') {
        formattedConditions = Object.fromEntries(matchedBranch.conditions as any);
      } else {
        formattedConditions = matchedBranch.conditions as Record<string, string>;
      }
    }

    return {
      success: true,
      sessionId: session._id.toString(),
      matchedBranch: matchedBranch
        ? {
            conditions: formattedConditions,
            resolvedAnswerId: matchedBranch.resolvedAnswerId?.toString(),
          }
        : undefined,
      answer: {
        ...localizedAnswer,
        personalizedAnswer: localizedAnswer.answerText,
      },
      personalized: true,
      language,
    };
  }
}

export const consultationService = new ConsultationService();
export default consultationService;
