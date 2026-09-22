import { Router } from 'express';
import { getKnowledgeBase, syncAnalytics } from '../controllers/syncController';

const router = Router();

// Public — the app needs the knowledge base before login
router.get('/knowledge-base', getKnowledgeBase);

// Accepts optional auth token (guest users may not have one)
router.post('/analytics', syncAnalytics);

export default router;
