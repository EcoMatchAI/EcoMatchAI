const express = require('express');
const router = express.Router();


const buyerController = require("../controller/buyerController");





router.post('/signup/initiate', buyerController.initiateSignup);
router.post('/signup/verify-otp', buyerController.verifyEmailOtp);
router.post('/signup/complete-profile', buyerController.completeProfile);
router.get('/profile', buyerController.getBuyerProfile)
router.post('/',buyerController.createBuyer)
router.get('/',buyerController.getAllBuyer)
router.patch('/',buyerController.updateBuyer)
//router.post('/verify/login',buyerController.verifyLoginOtp)

module.exports = router