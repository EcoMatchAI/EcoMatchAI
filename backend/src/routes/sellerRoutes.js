const express = require('express');
const router = express.Router();


const SellerController = require("../controller/sellerController");






router.post('/signup/initiate', SellerController.initiateSignup);
router.post('/signup/verify-otp', SellerController.verifyEmailOtp);
router.post('/signup/complete-profile', SellerController.completeProfile);
router.get('/profile', SellerController.getSellerProfile)
router.post('/',SellerController.createSeller)
router.get('/',SellerController.getAllSellers)
router.patch('/',SellerController.updateSeller)
//router.post('/verify/login',SellerController.verifyLoginOtp)

module.exports = router