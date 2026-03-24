const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const {
  requestEducatorSignup,
  verifyEducatorOTP,
  completeEducatorSignup,
  loginEducator,
  logoutEducator,
  getEducatorProfile,
  requestPasswordReset,
  verifyPasswordResetOTP,
  resetPassword,
  changePassword
} = require('../controllers/educatorAuth');

// Public routes
router.post('/request-signup', requestEducatorSignup);
router.post('/verify-otp', verifyEducatorOTP);
router.post('/complete-signup', completeEducatorSignup);
router.post('/login', loginEducator);
router.post('/logout', logoutEducator);

// Password reset routes (public)
router.post('/request-password-reset', requestPasswordReset);
router.post('/verify-password-reset-otp', verifyPasswordResetOTP);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/profile', protect, restrictTo('educator', 'mentor'), getEducatorProfile);
router.post('/change-password', protect, restrictTo('educator', 'mentor'), changePassword);

module.exports = router;
