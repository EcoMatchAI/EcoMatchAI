import express from 'express';
import { protect } from '../middleware/auth.js';
import requireProfileComplete from '../middleware/requireProfileComplete.js';

const router = express.Router();

/**
 * @route   GET /api/dashboard
 * @desc    Example protected resource. Demonstrates the signup flow gate:
 *          a user can only reach the dashboard after completing their profile.
 *          protect -> requireProfileComplete -> handler
 * @access  Private + profile complete
 */
router.get('/', protect, requireProfileComplete, (req, res) => {
  res.status(200).json({
    message: `Welcome to your dashboard, ${req.user.name}!`,
    role: req.user.roleLabel,
  });
});

export default router;
