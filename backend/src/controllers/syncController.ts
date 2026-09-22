import { Request, Response } from 'express';
import Level1Question from '../models/Level1Question';
import Answer from '../models/Answer';
import ConsultationQuery from '../models/ConsultationQuery';
import QueryClickStats from '../models/QueryClickStats';

/**
 * GET /api/sync/knowledge-base
 * Returns the full active knowledge base for offline caching.
 * Includes a dataVersion timestamp so the app can skip re-downloading if nothing changed.
 */
export const getKnowledgeBase = async (req: Request, res: Response): Promise<void> => {
  try {
    const clientVersion = req.query.since ? new Date(req.query.since as string) : null;

    // Find the most recent update across all collections
    const [latestQuestion, latestAnswer, latestConsultation] = await Promise.all([
      Level1Question.findOne({ isActive: true }).sort({ updatedAt: -1 }).select('updatedAt').lean(),
      Answer.findOne().sort({ updatedAt: -1 }).select('updatedAt').lean(),
      ConsultationQuery.findOne().sort({ updatedAt: -1 }).select('updatedAt').lean(),
    ]);

    const timestamps = [
      latestQuestion?.updatedAt,
      latestAnswer?.updatedAt,
      latestConsultation?.updatedAt,
    ].filter(Boolean) as Date[];

    const dataVersion = timestamps.length > 0
      ? new Date(Math.max(...timestamps.map(t => new Date(t).getTime())))
      : new Date();

    // If client already has the latest version, return 304-like response
    if (clientVersion && clientVersion >= dataVersion) {
      res.status(200).json({
        success: true,
        upToDate: true,
        dataVersion: dataVersion.toISOString(),
        items: [],
      });
      return;
    }

    // Fetch all active questions
    const questions = await Level1Question.find({ isActive: true })
      .select('-embedding')
      .lean();

    // Fetch all answers and consultation queries
    const [answers, consultations] = await Promise.all([
      Answer.find().lean(),
      ConsultationQuery.find().lean(),
    ]);

    // Build a lookup map for answers and consultations by level1QuestionId
    const answersByQuestionId = new Map<string, any>();
    for (const answer of answers) {
      if (answer.level1QuestionId) {
        answersByQuestionId.set(answer.level1QuestionId.toString(), answer);
      }
    }

    const consultationsByQuestionId = new Map<string, any>();
    for (const consultation of consultations) {
      if (consultation.level1QuestionId) {
        consultationsByQuestionId.set(consultation.level1QuestionId.toString(), consultation);
      }
    }

    // Compose the response items
    const items = questions.map((q) => {
      const qId = q._id.toString();
      const answer = answersByQuestionId.get(qId);
      const consultation = consultationsByQuestionId.get(qId);

      return {
        id: qId,
        questionText: q.canonicalQuestionText,
        tags: q.tags || [],
        answerText: answer?.answerText || null,
        reasonText: answer?.reasonText || null,
        remedyText: answer?.remedyText || null,
        homeRemedyText: answer?.homeRemedyText || null,
        dosageInstructions: answer?.dosageInstructions || null,
        safetyDisclaimerText: answer?.safetyDisclaimerText || null,
        videoUrl: answer?.videoUrl || null,
        diagnosticQ1: consultation?.diagnosticQuestions?.[0]?.questionText || null,
        diagnosticQ2: consultation?.diagnosticQuestions?.[1]?.questionText || null,
        diagnosticQ3: consultation?.diagnosticQuestions?.[2]?.questionText || null,
        updatedAt: q.updatedAt ? new Date(q.updatedAt).getTime() : Date.now(),
      };
    });

    res.status(200).json({
      success: true,
      upToDate: false,
      dataVersion: dataVersion.toISOString(),
      totalItems: items.length,
      items,
    });
  } catch (error: any) {
    console.error('Sync knowledge base error:', error);
    res.status(500).json({ success: false, message: 'Failed to sync knowledge base' });
  }
};

/**
 * POST /api/sync/analytics
 * Receives a batch of offline search events from the Android app.
 * Each event increments QueryClickStats.clickCount for the matched question.
 */
export const syncAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { events } = req.body;

    if (!Array.isArray(events) || events.length === 0) {
      res.status(400).json({ success: false, message: 'events array is required and must not be empty' });
      return;
    }

    let processed = 0;
    let skipped = 0;

    for (const event of events) {
      try {
        const { queryText, timestamp, userId, matchedQuestionId } = event;

        if (!queryText || !timestamp) {
          skipped++;
          continue;
        }

        if (matchedQuestionId) {
          // Increment the click count for the matched question
          const statsFilter: any = {
            level1QuestionId: matchedQuestionId,
          };
          if (userId) {
            statsFilter.userId = userId;
          }

          await QueryClickStats.findOneAndUpdate(
            statsFilter,
            {
              $inc: { clickCount: 1 },
              $setOnInsert: {
                firstAskedAt: new Date(timestamp),
                ...(userId ? { userId } : {}),
              },
            },
            { upsert: true }
          );
        }

        processed++;
      } catch (eventError) {
        console.error('Error processing analytics event:', eventError);
        skipped++;
      }
    }

    res.status(200).json({
      success: true,
      processed,
      skipped,
      total: events.length,
    });
  } catch (error: any) {
    console.error('Sync analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to sync analytics' });
  }
};
