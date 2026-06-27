const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const {
  login,
  refresh,
  forgotPin,
  verifyOTP,
  resetPin,
  logout,
  getMe,
  changePin,
  toggleBiometric,
} = require('../controllers/auth.controller');

router.post('/login', login);
router.post('/refresh', refresh);
router.post('/forgot-pin', forgotPin);
router.post('/verify-otp', verifyOTP);
router.post('/reset-pin', resetPin);
router.post('/logout', verifyToken, logout);
router.get('/me', verifyToken, getMe);
router.put('/change-pin', verifyToken, changePin);
router.put('/biometric', verifyToken, toggleBiometric);

module.exports = router;
