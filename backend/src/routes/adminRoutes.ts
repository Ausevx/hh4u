import { Router } from 'express';
import adminAuthMiddleware from '../middlewares/adminAuthMiddleware';
import uploadExcelMiddleware from '../middlewares/uploadMiddleware';
import * as adminAuthController from '../controllers/adminAuthController';
import * as adminKnowledgeBaseController from '../controllers/adminKnowledgeBaseController';
import * as adminVectorController from '../controllers/adminVectorController';

const router = Router();

// ============================================================================
// Public Endpoints (Authentication & Diagnostics)
// ============================================================================
router.post('/auth/login', adminAuthController.login);

// Vector Pipeline Diagnostics & Sync
router.get('/vector-status', adminVectorController.getVectorStatus);
router.post('/vector-sync', adminVectorController.syncVectors);

// ============================================================================
// Protected Admin Endpoints (Guarded by adminAuthMiddleware)
// ============================================================================
router.use(adminAuthMiddleware);

// Admin Profile
router.get('/auth/me', adminAuthController.me);

// KPI Stats
router.get('/stats', adminKnowledgeBaseController.getStats);

// Knowledge Base Composite CRUD
router.get('/knowledge-base', adminKnowledgeBaseController.listKnowledgeBase);
router.get('/knowledge-base/:id', adminKnowledgeBaseController.getKnowledgeBaseById);
router.post('/knowledge-base', adminKnowledgeBaseController.createKnowledgeBase);
router.put('/knowledge-base/:id', adminKnowledgeBaseController.updateKnowledgeBase);
router.delete('/knowledge-base/:id', adminKnowledgeBaseController.deleteKnowledgeBase);

// Bulk Multipart Excel Import Endpoint
router.post(
  '/knowledge-base/import',
  uploadExcelMiddleware,
  adminKnowledgeBaseController.importExcel
);

export default router;
