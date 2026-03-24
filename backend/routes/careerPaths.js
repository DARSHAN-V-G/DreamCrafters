const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/careerPathController');

// ── Validation middleware helper ──
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: errors.array()[0].msg });
  }
  next();
};

// ════════════════════════════════════════════
// CATEGORY ROUTES
// ════════════════════════════════════════════

// GET /api/categories (public)
router.get('/categories', ctrl.getCategories);

// ════════════════════════════════════════════
// CAREER PATH ROUTES
// ════════════════════════════════════════════

// GET /api/career-paths (public)
router.get('/career-paths', ctrl.listCareerPaths);

// GET /api/career-paths/:id (public)
router.get('/career-paths/:id', ctrl.getCareerPathById);

// POST /api/career-paths (admin only)
router.post(
  '/career-paths',
  protect,
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('required_skills')
      .optional()
      .isArray()
      .withMessage('required_skills must be an array'),
    validate,
  ],
  ctrl.createCareerPath
);

// PUT /api/career-paths/:id (admin only)
router.put(
  '/career-paths/:id',
  protect,
  [
    body('title').optional().notEmpty().withMessage('Title cannot be empty'),
    body('required_skills')
      .optional()
      .isArray()
      .withMessage('required_skills must be an array'),
    validate,
  ],
  ctrl.updateCareerPath
);

// DELETE /api/career-paths/:id (admin only)
router.delete('/career-paths/:id', protect, ctrl.deleteCareerPath);

module.exports = router;
