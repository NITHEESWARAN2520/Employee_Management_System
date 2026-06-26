const express = require('express');
const router = express.Router();
const { checkIn, checkOut, breakStart, breakEnd } = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Secure all attendance routes to employees only
router.use(protect);
router.use(authorize('employee'));

router.post('/check-in', checkIn);
router.post('/check-out', checkOut);
router.post('/break-start', breakStart);
router.post('/break-end', breakEnd);

module.exports = router;
