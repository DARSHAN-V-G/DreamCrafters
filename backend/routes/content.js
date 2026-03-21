const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/contentController');

// ── Validation middleware helper ──
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: errors.array()[0].msg });
  }
  next();
};

// ── Optional auth middleware ──
// Tries to verify the token but calls next() regardless
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

// 1. GET /api/content/recommended (auth required) — BEFORE /:id
router.get('/content/recommended', protect, ctrl.getRecommended);

// 2. GET /api/content/bookmarks (auth required) — BEFORE /:id
router.get('/content/bookmarks', protect, ctrl.getBookmarks);

// 3. GET /api/content/:id (optionalAuth)
router.get('/content/:id', optionalAuth, ctrl.getContentById);

// 4. GET /api/content (public, with filters)
router.get('/content', ctrl.listContent);

// 5. POST /api/content (admin only)
router.post(
  '/content',
  protect,
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('type')
      .isIn(['video', 'article', 'quiz', 'ebook'])
      .withMessage('Invalid content type'),
    body('category_id').isInt().withMessage('category_id must be an integer'),
    body('difficulty')
      .optional()
      .isIn(['beginner', 'intermediate', 'advanced'])
      .withMessage('Invalid difficulty level'),
    body('duration_minutes')
      .optional()
      .isInt({ min: 1 })
      .withMessage('duration_minutes must be a positive integer'),
    validate,
  ],
  ctrl.createContent
);

// 6. PUT /api/content/:id (admin only)
router.put(
  '/content/:id',
  protect,
  [
    body('title').optional().notEmpty().withMessage('Title cannot be empty'),
    body('type')
      .optional()
      .isIn(['video', 'article', 'quiz', 'ebook'])
      .withMessage('Invalid content type'),
    body('category_id')
      .optional()
      .isInt()
      .withMessage('category_id must be an integer'),
    body('difficulty')
      .optional()
      .isIn(['beginner', 'intermediate', 'advanced'])
      .withMessage('Invalid difficulty level'),
    body('duration_minutes')
      .optional()
      .isInt({ min: 1 })
      .withMessage('duration_minutes must be a positive integer'),
    validate,
  ],
  ctrl.updateContent
);

// 7. DELETE /api/content/:id (admin only)
router.delete('/content/:id', protect, ctrl.deleteContent);

// 8. PUT /api/content/:id/progress (auth required)
router.put(
  '/content/:id/progress',
  protect,
  [
    body('progress_percent')
      .isInt({ min: 0, max: 100 })
      .withMessage('progress_percent must be an integer between 0 and 100'),
    body('status')
      .optional()
      .isIn(['not_started', 'in_progress', 'completed'])
      .withMessage('Invalid status'),
    validate,
  ],
  ctrl.updateProgress
);

// 9. POST /api/content/:id/bookmark (auth required)
router.post('/content/:id/bookmark', protect, ctrl.addBookmark);

// 10. DELETE /api/content/:id/bookmark (auth required)
router.delete('/content/:id/bookmark', protect, ctrl.removeBookmark);

module.exports = router;
