const express = require('express');
const router = express.Router();
const { requestLeave, approveLeave, getLeaveRequests } = require('../controllers/leaveController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

// Employee routes
router.post('/request', authorize('employee'), requestLeave);

// Admin/HR routes
router.get('/', authorize('admin', 'hr'), getLeaveRequests);
router.put('/approve/:id', authorize('admin', 'hr'), approveLeave);

module.exports = router;
