const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/webinarController');

// ── Validation middleware helper ──
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: errors.array()[0].msg });
  }
  next();
};

// ── Optional auth middleware ──
const optionalAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) return next();
  try {
    const token = header.split(' ')[1];
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch (_) {
    /* ignore invalid token */
  }
  next();
};

// ════════════════════════════════════════════
// ROUTE ORDER IS CRITICAL — specific routes before /:id
// ════════════════════════════════════════════

// 1. GET /api/webinars/my-registrations (auth required) — BEFORE /:id
router.get('/webinars/my-registrations', protect, ctrl.getMyRegistrations);

// 2. GET /api/webinars/my-webinars (educator/mentor)
router.get('/webinars/my-webinars', protect, ctrl.getMyWebinars);

// 3. GET /api/webinars (public)
router.get('/webinars', ctrl.listWebinars);

// 4. GET /api/webinars/:id (optionalAuth)
router.get('/webinars/:id', optionalAuth, ctrl.getWebinarById);

// 5. POST /api/webinars (admin or mentor)
router.post(
  '/webinars',
  protect,
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('scheduled_at')
      .isISO8601()
      .withMessage('scheduled_at must be a valid ISO timestamp')
      .custom((value) => {
        if (new Date(value) <= new Date()) {
          throw new Error('scheduled_at must be a future date');
        }
        return true;
      }),
    body('max_participants')
      .optional()
      .isInt({ min: 1 })
      .withMessage('max_participants must be a positive integer'),
    body('duration_minutes')
      .optional()
      .isInt({ min: 1 })
      .withMessage('duration_minutes must be a positive integer'),
    validate,
  ],
  ctrl.createWebinar
);

// 6. PUT /api/webinars/:id (admin or host mentor)
router.put(
  '/webinars/:id',
  protect,
  [
    body('title').optional().notEmpty().withMessage('Title cannot be empty'),
    body('scheduled_at')
      .optional()
      .isISO8601()
      .withMessage('scheduled_at must be a valid ISO timestamp'),
    body('max_participants')
      .optional()
      .isInt({ min: 1 })
      .withMessage('max_participants must be a positive integer'),
    body('duration_minutes')
      .optional()
      .isInt({ min: 1 })
      .withMessage('duration_minutes must be a positive integer'),
    validate,
  ],
  ctrl.updateWebinar
);

// 7. DELETE /api/webinars/:id (admin or host mentor)
router.delete('/webinars/:id', protect, ctrl.deleteWebinar);

// 8. POST /api/webinars/:id/register (auth required)
router.post('/webinars/:id/register', protect, ctrl.registerForWebinar);

// 9. DELETE /api/webinars/:id/register (auth required)
router.delete('/webinars/:id/register', protect, ctrl.cancelRegistration);

module.exports = router;
