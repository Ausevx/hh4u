import { Router, Request, Response, NextFunction } from 'express';
import chatbotController from '../controllers/chatbotController';
import { verifyToken } from '../utils/jwt';

const router = Router();

/**
 * Optional authentication middleware.
 * If a valid JWT Bearer token is passed, attaches decoded payload to req.user.
 * If no token is provided (guest/anonymous access), proceeds without error.
 */
export const optionalAuthenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token) {
      try {
        const decoded = verifyToken(token);
        req.user = decoded;
      } catch {
        // Continue as unauthenticated guest for chatbot interactions
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
