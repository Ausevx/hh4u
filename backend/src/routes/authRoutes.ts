import { Router } from 'express';
import {
  guestAuth,
  requestOtp,
  verifyOtp,
  googleAuth,
  getMe,
  logout
} from '../controllers/authController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { authRateLimit } from '../middlewares/authRateLimit';

const router = Router();
router.use(authRateLimit);

router.post('/guest', guestAuth);
router.post('/otp/request', requestOtp);
router.post('/otp/send', requestOtp); // Alias for convenience
router.post('/otp/verify', verifyOtp);
router.post('/google', googleAuth);
router.get('/me', authenticateToken, getMe);
router.post('/logout', authenticateToken, logout);

export default router;
