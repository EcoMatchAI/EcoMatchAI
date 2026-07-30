const express = require('express');
const router = express.Router();
const AuthController = require('../controller/authContoller');



router.post('/login', AuthController.login);
router.get('/me', AuthController.getMe);
router.post('/logout', AuthController.logout);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);


module.exports = router;