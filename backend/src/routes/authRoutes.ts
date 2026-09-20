import { Router } from 'express';
import {
  guestAuth,
  requestOtp,
  verifyOtp,
  googleAuth,
  getMe
} from '../controllers/authController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

router.post('/guest', guestAuth);
router.post('/otp/request', requestOtp);
router.post('/otp/send', requestOtp); // Alias for convenience
router.post('/otp/verify', verifyOtp);
router.post('/google', googleAuth);
router.get('/me', authenticateToken, getMe);

export default router;
