const express = require('express');
const router = express.Router();

const UserController = require("../controller/userController");

router.post('/signup/', UserController.initiateSignup);
router.post('/signup/verify-otp', UserController.verifyEmailOtp);
router.post('/signup/complete-profile', UserController.completeProfile);
router.get('/profile', UserController.getUserProfile);
router.get('/', UserController.getAllUsers);
router.patch('/', UserController.updateUser);
router.delete('/', UserController.deleteUser);

module.exports = router;
