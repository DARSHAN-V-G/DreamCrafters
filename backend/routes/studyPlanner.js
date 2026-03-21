const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/studyPlannerController');

// ── Validation middleware helper ──
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: errors.array()[0].msg });
  }
  next();
};

// All routes require authentication
router.use(protect);

// ════════════════════════════════════════════
// STUDY PLANS
// ════════════════════════════════════════════

// POST /api/study-plans/generate — AI generates a study plan
router.post(
  '/study-plans/generate',
  [
    body('goal').notEmpty().withMessage('Goal is required'),
    body('start_date').isDate().withMessage('start_date must be a valid date (YYYY-MM-DD)'),
    body('daily_hours').isInt({ min: 1, max: 8 }).withMessage('daily_hours must be between 1 and 8'),
    body('end_date').optional().isDate().withMessage('end_date must be a valid date'),
    body('career_path_id').optional().isInt().withMessage('career_path_id must be an integer'),
    validate,
  ],
  ctrl.generatePlan
);

// GET /api/study-plans — List user's study plans
router.get('/study-plans', ctrl.listPlans);

// GET /api/study-plans/:id — Get one plan with all sessions
router.get('/study-plans/:id', ctrl.getPlan);

// POST /api/study-plans — Manually create a plan
router.post(
  '/study-plans',
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('start_date').isDate().withMessage('start_date must be a valid date (YYYY-MM-DD)'),
    body('end_date').optional().isDate().withMessage('end_date must be a valid date'),
    validate,
  ],
  ctrl.createPlan
);

// PUT /api/study-plans/:id — Update a plan
router.put(
  '/study-plans/:id',
  [
    body('status').optional().isIn(['active', 'paused', 'completed', 'archived']).withMessage('Invalid status'),
    validate,
  ],
  ctrl.updatePlan
);

// DELETE /api/study-plans/:id — Delete a plan
router.delete('/study-plans/:id', ctrl.deletePlan);

// ════════════════════════════════════════════
// PROGRESS & SESSIONS
// ════════════════════════════════════════════

// GET /api/study-plans/:id/progress — Completion stats
router.get('/study-plans/:id/progress', ctrl.getPlanProgress);

// GET /api/study-plans/:id/sessions — List sessions for a plan
router.get('/study-plans/:id/sessions', ctrl.listSessions);

// POST /api/study-plans/:id/sessions — Add a session manually
router.post(
  '/study-plans/:id/sessions',
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('scheduled_date').isDate().withMessage('scheduled_date must be a valid date (YYYY-MM-DD)'),
    body('duration_minutes').isInt({ min: 5 }).withMessage('duration_minutes must be at least 5'),
    body('priority').optional().isIn([1, 2, 3]).withMessage('priority must be 1, 2, or 3'),
    body('content_id').optional().isInt().withMessage('content_id must be an integer'),
    validate,
  ],
  ctrl.addSession
);

// PATCH /api/study-sessions/:id/complete — Mark session as completed
router.patch('/study-sessions/:id/complete', ctrl.completeSession);

// PATCH /api/study-sessions/:id/reschedule — Reschedule a session
router.patch(
  '/study-sessions/:id/reschedule',
  [
    body('new_date').isDate().withMessage('new_date must be a valid date (YYYY-MM-DD)'),
    body('reason').optional().isIn(['missed', 'user_request', 'ai']).withMessage('reason must be missed, user_request, or ai'),
    validate,
  ],
  ctrl.rescheduleSession
);

// POST /api/study-sessions/auto-reschedule — AI reschedules all missed sessions
router.post(
  '/study-sessions/auto-reschedule',
  [
    body('plan_id').isInt().withMessage('plan_id is required and must be an integer'),
    validate,
  ],
  ctrl.autoReschedule
);

// DELETE /api/study-sessions/:id — Delete a session
router.delete('/study-sessions/:id', ctrl.deleteSession);

// ════════════════════════════════════════════
// PERSONALIZATION
// ════════════════════════════════════════════

// GET /api/personalization/profile — Get personalization profile
router.get('/personalization/profile', ctrl.getProfile);

// POST /api/personalization/assess — Submit quiz, update profile
router.post(
  '/personalization/assess',
  [
    body('quiz_answers').isArray({ min: 1 }).withMessage('quiz_answers must be a non-empty array'),
    body('quiz_answers.*.question_id').isInt().withMessage('Each answer must have an integer question_id'),
    body('quiz_answers.*.answer').notEmpty().withMessage('Each answer must have a non-empty answer'),
    validate,
  ],
  ctrl.assess
);

// ════════════════════════════════════════════
// RECOMMENDATIONS
// ════════════════════════════════════════════

// GET /api/recommendations — Get AI recommendations
router.get('/recommendations', ctrl.getRecommendations);

// PATCH /api/recommendations/:id/accept — Accept a recommendation
router.patch('/recommendations/:id/accept', ctrl.acceptRecommendation);

// PATCH /api/recommendations/:id/dismiss — Dismiss a recommendation
router.patch('/recommendations/:id/dismiss', ctrl.dismissRecommendation);

module.exports = router;
