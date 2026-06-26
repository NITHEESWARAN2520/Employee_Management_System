const express = require('express');
const router = express.Router();
const {
  getAllEmployees,
  getEmployeeDashboard,
  getAdminDashboard,
  createEmployee,
  updateEmployee,
  deleteEmployee
} = require('../controllers/employeeController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Dashboard endpoints
router.get('/dashboard', protect, authorize('employee'), getEmployeeDashboard);
router.get('/admin-dashboard', protect, authorize('admin', 'hr'), getAdminDashboard);

// Standard CRUD endpoints
router.get('/', protect, authorize('admin', 'hr'), getAllEmployees);
router.post('/', protect, authorize('admin', 'hr'), createEmployee);
router.put('/:id', protect, authorize('admin', 'hr'), updateEmployee);
router.delete('/:id', protect, authorize('admin'), deleteEmployee); // Deletion restricted to Admin only

module.exports = router;
