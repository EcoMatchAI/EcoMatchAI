import express from 'express';
import {
  signup,
  login,
  getMe,
  verifyEmail,
  resendVerification,
  requestEmailChange,
  verifyEmailChange,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// --- Auth ---
router.post('/signup', signup);
router.post('/login', login);
router.get('/me', protect, getMe);

// --- Email verification (signup) ---
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);

// --- Email change (authenticated) ---
router.post('/request-email-change', protect, requestEmailChange);
router.get('/verify-email-change', verifyEmailChange);

export default router;
