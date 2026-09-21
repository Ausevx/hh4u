import { Request, Response } from 'express';
import mongoose from 'mongoose';
import adminKnowledgeBaseService from '../services/adminKnowledgeBaseService';
import { ExcelValidationError } from '../services/excelParserService';

/**
 * GET /api/admin/stats
 * Aggregates Knowledge Base KPI statistics for admin dashboard.
 */
export const getStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await adminKnowledgeBaseService.getKnowledgeBaseStats();

    res.status(200).json({
      success: true,
      stats: {
        totalQuestions: stats.totalQuestions,
        activeQuestions: stats.activeQuestions,
        inactiveQuestions: stats.inactiveQuestions,
        totalConsultations: stats.totalConsultations,
        totalAnswers: stats.totalAnswers,
        vectorIndexActive: stats.vectorIndexActive,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to retrieve admin stats',
    });
  }
};

/**
 * GET /api/admin/knowledge-base
 * Search, filter, and paginate knowledge base items.
 */
export const listKnowledgeBase = async (req: Request, res: Response): Promise<void> => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    let page = parseInt(req.query.page as string, 10);
    let limit = parseInt(req.query.limit as string, 10);

    // Boundary normalization
    if (isNaN(page) || page <= 0) page = 1;
    if (isNaN(limit) || limit <= 0) limit = 20;

    const tag = typeof req.query.tag === 'string' ? req.query.tag.trim() : undefined;
    const isActive =
      req.query.isActive === 'true'
        ? true
        : req.query.isActive === 'false'
        ? false
        : undefined;

    const result = await adminKnowledgeBaseService.listKnowledgeBaseItems({
      search,
      page,
      limit,
      tag,
      isActive,
    });

    res.status(200).json({
      success: true,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
      items: result.items,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to list knowledge base items',
    });
  }
};

/**
 * GET /api/admin/knowledge-base/:id
 * Retrieves a single composite knowledge base item.
 */
export const getKnowledgeBaseById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) || '';

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid question ID format',
      });
      return;
    }

    const item = await adminKnowledgeBaseService.getKnowledgeBaseItemById(id);
    if (!item) {
      res.status(404).json({
        success: false,
        message: 'Question not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      item,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to retrieve knowledge base item',
    });
  }
};

/**
 * POST /api/admin/knowledge-base
 * Atomically creates a Question, Consultation Query, and Answer.
 */
export const createKnowledgeBase = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      canonicalQuestionText,
      tags,
      diagnosticQuestions,
      answerText,
      homeRemedyText,
      remedyText,
      videoUrl,
    } = req.body || {};

    // Strict validation on required canonical text
    if (
      !canonicalQuestionText ||
      typeof canonicalQuestionText !== 'string' ||
      canonicalQuestionText.trim() === ''
    ) {
      res.status(400).json({
        success: false,
        message: 'canonicalQuestionText is required',
      });
      return;
    }

    const item = await adminKnowledgeBaseService.createKnowledgeBaseItem({
      canonicalQuestionText: canonicalQuestionText.trim(),
      tags: Array.isArray(tags) ? tags : [],
      diagnosticQuestions: Array.isArray(diagnosticQuestions) ? diagnosticQuestions : [],
      answerText: answerText?.trim(),
      homeRemedyText: (homeRemedyText || remedyText)?.trim(),
      remedyText: (remedyText || homeRemedyText)?.trim(),
      videoUrl: videoUrl?.trim(),
      isActive: true,
    });

    res.status(201).json({
      success: true,
      item,
    });
  } catch (err: any) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: err.message || 'Failed to create knowledge base entry',
    });
  }
};

/**
 * PUT /api/admin/knowledge-base/:id
 * Updates Question, Diagnostic Query, and/or Answer.
 */
export const updateKnowledgeBase = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) || '';

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({
        success: false,
        message: 'Invalid or non-existent question ID',
      });
      return;
    }

    const updated = await adminKnowledgeBaseService.updateKnowledgeBaseItem(id, req.body || {});
    if (!updated) {
      res.status(404).json({
        success: false,
        message: 'Question not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      item: updated,
    });
  } catch (err: any) {
    if (
      err?.name === 'VersionError' ||
      err?.name === 'CastError' ||
      err?.name === 'DocumentNotFoundError'
    ) {
      res.status(404).json({
        success: false,
        message: 'Question not found',
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to update knowledge base entry',
    });
  }
};

/**
 * DELETE /api/admin/knowledge-base/:id
 * Deletes question and cascades to associated consultation queries and answers.
 */
export const deleteKnowledgeBase = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) || '';

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({
        success: false,
        message: 'Invalid question ID',
      });
      return;
    }

    const result = await adminKnowledgeBaseService.deleteKnowledgeBaseItem(id);
    if (!result) {
      res.status(404).json({
        success: false,
        message: 'Question not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Knowledge base item deleted successfully',
      deletedCount: result.deletedCount,
    });
  } catch (err: any) {
    if (
      err?.name === 'CastError' ||
      err?.name === 'VersionError' ||
      err?.name === 'DocumentNotFoundError'
    ) {
      res.status(404).json({
        success: false,
        message: 'Question not found',
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to delete knowledge base entry',
    });
  }
};

/**
 * POST /api/admin/knowledge-base/import
 * Multipart Excel upload handler for bulk ingestion.
 */
export const importExcel = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file || !req.file.buffer || req.file.buffer.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
      return;
    }

    const rawMode = (req.body?.mode || req.query?.mode || 'append').toString().toLowerCase().trim();
    if (rawMode !== 'append' && rawMode !== 'overwrite') {
      res.status(400).json({
        success: false,
        message: "Invalid mode. Allowed modes are 'append' or 'overwrite'",
      });
      return;
    }
    const mode: 'append' | 'overwrite' = rawMode;

    const result = await adminKnowledgeBaseService.importKnowledgeBaseFromExcel(req.file.buffer, mode);

    res.status(200).json({
      success: true,
      mode,
      counts: result.counts,
    });
  } catch (err: any) {
    if (err instanceof ExcelValidationError || err.name === 'ExcelValidationError' || err.statusCode === 400) {
      res.status(err.statusCode || 400).json({
        success: false,
        message: err.message,
        details: err.details,
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: err.message || 'Internal server error during Excel import',
    });
  }
};

export default {
  getStats,
  listKnowledgeBase,
  getKnowledgeBaseById,
  createKnowledgeBase,
  updateKnowledgeBase,
  deleteKnowledgeBase,
  importExcel,
};
