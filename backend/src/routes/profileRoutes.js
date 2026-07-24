import express from 'express';
import { getProfile, completeProfile, updateProfile } from '../controllers/profileController.js';
import { protect } from '../middleware/auth.js';
import requireProfileComplete from '../middleware/requireProfileComplete.js';

const router = express.Router();

// All profile routes require a valid token
router.use(protect);

// View own profile
router.get('/', getProfile);

// Complete the business profile (signup -> complete profile step)
router.post('/complete', completeProfile);

// Edit profile later — only allowed once profile is already complete
router.patch('/', requireProfileComplete, updateProfile);

export default router;
