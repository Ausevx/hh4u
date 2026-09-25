import { Router, Request, Response, NextFunction } from 'express';
import chatbotController from '../controllers/chatbotController';
import { validateSession, InvalidSession } from '../middlewares/authMiddleware';

const router = Router();

/**
 * Optional authentication middleware.
 * If a valid JWT Bearer token is passed, attaches decoded payload to req.user.
 * If no token is provided (guest/anonymous access), proceeds without error.
 */
export const optionalAuthenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token) {
      try {
        const decoded = await validateSession(token);
        req.user = decoded;
      } catch (error) {
        res.status(error instanceof InvalidSession ? 401 : 503).json({ success: false,
          message: error instanceof InvalidSession ? 'Please sign in again.' : 'Session verification is temporarily unavailable.' });
        return;
      }
    }
  }
  next();
};

// Mount endpoints
router.post('/query', optionalAuthenticateToken, (req, res) =>
  chatbotController.handleQuery(req, res)
);

router.post('/consultation-answer', optionalAuthenticateToken, (req, res) =>
  chatbotController.handleConsultationAnswer(req, res)
);

export default router;
