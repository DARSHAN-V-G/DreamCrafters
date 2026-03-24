const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const {
  requestStudentSignup,
  verifyStudentOTP,
  completeStudentSignup,
  loginStudent,
  logoutStudent,
  getStudentProfile,
  updateStudentProfile,
  requestPasswordReset,
  verifyPasswordResetOTP,
  resetPassword,
  changePassword
} = require('../controllers/studentAuth');

// Public routes
router.post('/request-signup', requestStudentSignup);
router.post('/verify-otp', verifyStudentOTP);
router.post('/complete-signup', completeStudentSignup);
router.post('/login', loginStudent);
router.post('/logout', logoutStudent);

// Password reset routes (public)
router.post('/request-password-reset', requestPasswordReset);
router.post('/verify-password-reset-otp', verifyPasswordResetOTP);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/profile', protect, restrictTo('student'), getStudentProfile);
router.put('/profile', protect, restrictTo('student'), updateStudentProfile);
router.post('/change-password', protect, restrictTo('student'), changePassword);

module.exports = router;
