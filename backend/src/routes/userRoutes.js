const express = require('express');
const router = express.Router();

const UserController = require("../controller/userController");
const authenticate = require("../middlewear/authMiddlewear");

// ---- Signup flow (no auth token yet — these carry the temp/verification token) ----
router.post('/signup/', UserController.initiateSignup);
router.post('/signup/resend-otp', UserController.resendSignupOtp);
router.post('/signup/verify-otp', UserController.verifyEmailOtp);
router.post('/signup/complete-profile', UserController.completeProfile);

// ---- Logged-in user ----
// These read req.user, so they MUST run behind `authenticate`.
router.get('/profile', authenticate, UserController.getUserProfile);
router.get('/', authenticate, UserController.getAllUsers);
router.patch('/', authenticate, UserController.updateUser);
router.delete('/', authenticate, UserController.deleteUser);

module.exports = router;
