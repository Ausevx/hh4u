import { Request, Response } from 'express';
import {
  inspectVectorHealth,
  backfillEmbeddings,
  ensureVectorIndex,
} from '../services/vectorBackfillService';

/**
 * GET /api/admin/vector-status
 * Health & diagnostic endpoint for vector search pipeline.
 * Reports total Level1Questions, embedding counts, Atlas vector index status,
 * and Gemini API key configuration status.
 */
export const getVectorStatus = async (_req: Request, res: Response): Promise<void> => {
  try {
    const health = await inspectVectorHealth();

    res.status(200).json({
      success: true,
      totalLevel1Questions: health.totalLevel1Questions,
      questionsWithEmbeddings: health.questionsWithEmbeddings,
      vectorIndexExists: health.vectorIndexExists,
      vectorIndexQueryable: health.vectorIndexQueryable,
      geminiApiKeyConfigured: health.geminiApiKeyConfigured,
      geminiApiKeyStatus: health.geminiApiKeyStatus,
      details: health.details,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to inspect vector pipeline status',
    });
  }
};

/**
 * POST /api/admin/vector-sync
 * Manually triggers embedding backfill/regeneration.
 * Accepts optional body: { force?: boolean, batchSize?: number, delayMs?: number }.
 */
export const syncVectors = async (req: Request, res: Response): Promise<void> => {
  try {
    const force = req.body?.force === true;
    const batchSize = typeof req.body?.batchSize === 'number' ? Math.max(1, Math.min(req.body.batchSize, 50)) : 10;
    const delayMs = typeof req.body?.delayMs === 'number' ? Math.max(0, req.body.delayMs) : 300;

    // Ensure index exists
    await ensureVectorIndex();

    // Run backfill
    const result = await backfillEmbeddings({ force, batchSize, delayMs });

    res.status(200).json({
      success: true,
      message: result.message,
      result: {
        totalQuestions: result.totalQuestions,
        updatedCount: result.updatedCount,
        skippedCount: result.skippedCount,
        durationMs: result.durationMs,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to sync vector embeddings',
    });
  }
};

export default {
  getVectorStatus,
  syncVectors,
};
