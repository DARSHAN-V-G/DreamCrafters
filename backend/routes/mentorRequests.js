const express = require('express');
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/mentorRequestController');

const router = express.Router();

router.get('/educators', protect, ctrl.listEducators);
router.post('/mentor-requests', protect, ctrl.createRequest);
router.get('/mentor-requests', protect, ctrl.listRequests);
router.patch('/mentor-requests/:id/accept', protect, ctrl.acceptRequest);
router.patch('/mentor-requests/:id/reject', protect, ctrl.rejectRequest);
router.delete('/mentor-requests/:id', protect, ctrl.withdrawRequest);

module.exports = router;
