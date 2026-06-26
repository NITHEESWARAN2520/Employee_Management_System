const express = require('express');
const router = express.Router();
const {
  getAllSalaries,
  createSalaryRecord,
  updateSalaryStatus,
  getEmployeeSalaries
} = require('../controllers/salaryController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

// Employee history route (accessible by owner or Admin/HR)
router.get('/employee/:employeeId', getEmployeeSalaries);

// Admin/HR endpoints
router.get('/', authorize('admin', 'hr'), getAllSalaries);
router.post('/', authorize('admin', 'hr'), createSalaryRecord);
router.put('/:id', authorize('admin', 'hr'), updateSalaryStatus);

module.exports = router;
