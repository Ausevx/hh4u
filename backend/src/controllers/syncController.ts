import { Request, Response } from 'express';
import QueryClickStats from '../models/QueryClickStats';
import { buildOfflineKnowledgeSnapshot } from '../services/offlineKnowledgeService';

export const getKnowledgeBase = async (req: Request, res: Response): Promise<void> => {
  try {
    const snapshot = await buildOfflineKnowledgeSnapshot();
    const upToDate = req.query.since === snapshot.dataVersion;
    res.json({ ...snapshot, upToDate, items: upToDate ? [] : snapshot.items });
  } catch (error) {
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
