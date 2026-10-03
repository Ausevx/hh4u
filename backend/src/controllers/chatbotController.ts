import { Request, Response } from 'express';
import mongoose from 'mongoose';
import chatbotService from '../services/chatbotService';
import consultationService from '../services/consultationService';
import ChatbotSession from '../models/ChatbotSession';

export class ChatbotController {
  /**
   * POST /chatbot/query & POST /api/chatbot/query
   */
  public async handleQuery(req: Request, res: Response): Promise<void> {
    try {
      const {
        text,
        query,
        queryText,
        audio,
        voiceData,
        mimeType,
        language,
        inputMode,
        intent,
      } = req.body || {};

      // Pull user identity from optional authenticated JWT if present
      const userId = req.user?.userId;
      const userEmail = req.user?.email;

      // Validate Intent
      if (!intent) {
        res.status(400).json({
          success: false,
          message: "Intent must be either 'direct_answer' or 'consultation'",
        });
        return;
      }

      if (intent !== 'direct_answer' && intent !== 'consultation') {
        res.status(400).json({
          success: false,
          message: "Intent must be either 'direct_answer' or 'consultation'",
        });
        return;
      }

      // Validate Query / Audio input presence
      const rawAudio = audio || voiceData;
      const hasAudio = !!rawAudio && (typeof rawAudio !== 'string' || rawAudio.trim().length > 0);
      const hasText = !!((text || query || queryText || '').trim());

      if (inputMode === 'voice' && !hasAudio) {
        res.status(400).json({
          success: false,
          message: "voiceData is required when inputMode is 'voice'",
        });
        return;
      }

      if (!hasAudio && !hasText) {
        res.status(400).json({
          success: false,
          message: 'Query text or voiceData is required',
        });
        return;
      }

      const response = await chatbotService.processQuery({
        text,
        query,
        queryText,
        audio,
        voiceData,
        mimeType,
        language,
        inputMode,
        intent,
        userId,
        userEmail,
      });

      res.status(200).json(response);
    } catch (error: any) {
      console.error('CHATBOT QUERY ERROR:', error);
      let status = error.statusCode;
      if (!status) {
        if (
          error.name === 'ValidationError' ||
          error.message?.includes('required') ||
          error.message?.includes('Intent must be')
        ) {
          status = 400;
        } else {
          status = 500;
        }
      }
      res.status(status).json({
        success: false,
        message: error.message || 'Error processing chatbot query',
        code: error.code,
      });
    }
  }

  /**
   * POST /chatbot/consultation-answer & POST /api/chatbot/consultation-answer
   */
  public async handleConsultationAnswer(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId, answers, consultationAnswers } = req.body || {};

      if (!sessionId) {
        res.status(400).json({
          success: false,
          message: 'sessionId is required',
        });
        return;
      }

      if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid sessionId format',
        });
        return;
      }

      const rawAnswers = answers || consultationAnswers;
      if (!rawAnswers || (typeof rawAnswers === 'object' && Object.keys(rawAnswers).length === 0)) {
        res.status(400).json({
          success: false,
          message: 'answers map is required',
        });
        return;
      }

      const response = await consultationService.resolveConsultationAnswer({
        sessionId,
        answers: rawAnswers,
      });

      res.status(200).json(response);
    } catch (error: any) {
      let status = error.statusCode;
      if (!status) {
        if (
          error.message?.toLowerCase().includes('not found') ||
          error.name === 'CastError'
        ) {
          status = 404;
        } else if (
          error.name === 'ValidationError' ||
          error.message?.includes('required') ||
          error.message?.includes('Invalid') ||
          error.message?.includes('Must be') ||
          error.message?.includes('must be')
        ) {
          status = 400;
        } else {
          status = 500;
        }
      }
      res.status(status).json({
        success: false,
        message: error.message || 'Error resolving consultation answer',
        code: error.code,
      });
    }
  }

  /**
   * GET /chatbot/history & GET /api/chatbot/history
   */
  public async handleHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Please sign in to view history',
        });
        return;
      }

      const sessions = await ChatbotSession.find({ userId })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('matchedLevel1QuestionId', 'canonicalQuestionText')
        .populate('finalAnswerId', 'remedyName remedyText answerText')
        .lean();

      const history = sessions.map((s) => ({
        id: s._id.toString(),
        queryText: s.originalQueryText,
        language: s.originalLanguage,
        intent: s.intent,
        inputMode: s.inputMode,
        matchConfident: s.matchConfident,
        matchedQuestion: (s.matchedLevel1QuestionId as any)?.canonicalQuestionText || null,
        remedyName: (s.finalAnswerId as any)?.remedyName || (s.finalAnswerId as any)?.remedyText || null,
        createdAt: s.createdAt,
      }));

      res.status(200).json({
        success: true,
        history,
      });
    } catch (error: any) {
      console.error('CHATBOT HISTORY ERROR:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error fetching conversation history',
      });
    }
  }
}

export const chatbotController = new ChatbotController();
export default chatbotController;
