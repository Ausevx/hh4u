import { requestMetadata, timed } from './searchTelemetry';
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
    reasonText?: string;
    personalizedAnswer: string;
    remedyName?: string;
    dosageInstructions?: string;
    homeRemedyText?: string;
    safetyDisclaimerText?: string;
    videoUrl?: string;
  };
  personalized: boolean;
  language?: string;
  requestId?: string;
}

export class ConsultationService {
  /**
   * Evaluates submitted diagnostic Yes/No answers against consultation answer branches,
   * resolves the matching saved answer and translates it only for non-English sessions,
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

    // 5. Additive Answer Resolution: root answer + each "yes" diagnostic answer
    // Always fetch the root Level 1 answer
    const rootAnswer = await timed('root_answer_lookup', () =>
      Answer.findOne({ level1QuestionId: session.matchedLevel1QuestionId, answerType: 'level1' })
        .then(a => a || Answer.findOne({ level1QuestionId: session.matchedLevel1QuestionId }))
    );

    if (!rootAnswer) {
      const error: any = new Error('No root answer found for this question. Please consult the clinic.');
      error.statusCode = 422;
      throw error;
    }

    // Collect diagnostic answers for questions answered "yes"
    const diagnosticAnswers: IAnswer[] = [];
    if (consultDoc?.answerBranches && consultDoc.answerBranches.length > 0) {
      for (const branch of consultDoc.answerBranches) {
        const conditions = branch.conditions;
        let branchKey = '';
        let branchVal = '';

        if (conditions instanceof Map || typeof (conditions as any).get === 'function') {
          const keys = Array.from((conditions as any).keys()) as string[];
          if (keys.length === 1) { branchKey = keys[0]; branchVal = ((conditions as any).get(branchKey) || '').toString().toLowerCase().trim(); }
        } else if (conditions && typeof conditions === 'object') {
          const keys = Object.keys(conditions);
          if (keys.length === 1) { branchKey = keys[0]; branchVal = ((conditions as any)[branchKey] || '').toString().toLowerCase().trim(); }
        }

        // If user answered "yes" to this diagnostic question, fetch its answer
        if (branchKey && branchVal === 'yes' && normalizedAnswers[branchKey] === 'yes' && branch.resolvedAnswerId) {
          const diagAns = await Answer.findById(branch.resolvedAnswerId);
          if (diagAns) diagnosticAnswers.push(diagAns);
        }
      }
    }

    // 6. Combine root + diagnostic answers additively
    const reasonParts = [rootAnswer.reasonText].filter(Boolean);
    const remedyParts = [(rootAnswer as any).remedyText || rootAnswer.homeRemedyText].filter(Boolean);
    const videoUrls: string[] = [rootAnswer.videoUrl].filter(Boolean) as string[];

    for (const da of diagnosticAnswers) {
      if (da.reasonText) reasonParts.push(da.reasonText);
      if ((da as any).remedyText || da.homeRemedyText) remedyParts.push((da as any).remedyText || da.homeRemedyText || '');
      if (da.videoUrl && !videoUrls.includes(da.videoUrl)) videoUrls.push(da.videoUrl);
    }

    const combinedReasonText = reasonParts.join('\n\n');
    const combinedRemedyText = remedyParts.join('\n\n');
    const combinedAnswerText = [combinedReasonText, combinedRemedyText].filter(Boolean).join('\n\n');

    // 7. Update ChatbotSession
    session.consultationAnswers = normalizedAnswers;
    if (rootAnswer?._id) {
      session.finalAnswerId = rootAnswer._id;
    }
    const language = session.originalLanguage || 'en';
    const [, localizedAnswer] = await Promise.all([
      session.save(),
      localizeFields(getAIServices().llm, {
        id: rootAnswer._id.toString(), answerText: combinedAnswerText,
        reasonText: combinedReasonText,
        remedyName: combinedRemedyText, dosageInstructions: rootAnswer.dosageInstructions,
        homeRemedyText: combinedRemedyText, safetyDisclaimerText: rootAnswer.safetyDisclaimerText,
        videoUrl: videoUrls[0],
      }, language, ANSWER_FIELDS),
    ]);

    const personalizedAnswerText = await getAIServices().llm.generatePersonalizedAnswer({
      originalQuery: session.originalQueryText || '',
      templateText: localizedAnswer.answerText,
      userLanguage: language,
      additionalContext: { consultationAnswers: normalizedAnswers },
    });

    return {
      ...requestMetadata(),
      success: true,
      sessionId: session._id.toString(),
      answer: {
        ...localizedAnswer,
        reasonText: localizedAnswer.reasonText || combinedReasonText,
        homeRemedyText: localizedAnswer.homeRemedyText || combinedRemedyText,
        videoUrl: videoUrls[0],
        personalizedAnswer: personalizedAnswerText,
      },
      personalized: true,
      language,
    };
  }
}

export const consultationService = new ConsultationService();
export default consultationService;
