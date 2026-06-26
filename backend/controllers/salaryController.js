const pool = require('../config/db');

/**
 * @desc    Get all salary records (Admin/HR)
 * @route   GET /api/salaries
 * @access  Private (Admin, HR)
 */
const getAllSalaries = async (req, res, next) => {
  try {
    const query = `
      SELECT 
        s.id,
        s.employee_id AS employeeId,
        e.name,
        e.department,
        s.basic_salary AS basicSalary,
        s.allowances,
        s.deductions,
        s.net_salary AS netSalary,
        DATE_FORMAT(s.payment_date, '%Y-%m-%d') AS paymentDate,
        s.status
      FROM salaries s
      JOIN employees e ON s.employee_id = e.id
      ORDER BY s.payment_date DESC
    `;
    const [salaries] = await pool.query(query);
    res.status(200).json({ success: true, count: salaries.length, salaries });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Record/Pay employee salary
 * @route   POST /api/salaries
 * @access  Private (Admin, HR)
 */
const createSalaryRecord = async (req, res, next) => {
  const { employeeId, basicSalary, allowances, deductions, paymentDate, status } = req.body;

  if (!employeeId || !basicSalary) {
    return res.status(400).json({ message: 'Employee ID and Basic Salary are required.' });
  }

  try {
    // Check if employee exists
    const [empRows] = await pool.query('SELECT id FROM employees WHERE id = ?', [employeeId]);
    if (empRows.length === 0) {
      return res.status(404).json({ message: 'Employee not found.' });
    }

    const basic = parseFloat(basicSalary);
    const allow = parseFloat(allowances || 0);
    const deduct = parseFloat(deductions || 0);

    // Calculate Net Salary: Basic Salary + Allowances - Deductions
    const netSalary = basic + allow - deduct;

    const [result] = await pool.query(
      `INSERT INTO salaries (employee_id, basic_salary, allowances, deductions, net_salary, payment_date, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [employeeId, basic, allow, deduct, netSalary, paymentDate || new Date(), status || 'pending']
    );

    res.status(201).json({
      success: true,
      message: 'Salary record created successfully.',
      data: {
        id: result.insertId,
        employeeId,
        basicSalary: basic,
        allowances: allow,
        deductions: deduct,
        netSalary,
        paymentDate: paymentDate || new Date(),
        status: status || 'pending'
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update salary payout status (e.g., mark as paid)
 * @route   PUT /api/salaries/:id
 * @access  Private (Admin, HR)
 */
const updateSalaryStatus = async (req, res, next) => {
  const salaryId = req.params.id;
  const { status } = req.body; // Expects 'paid' or 'pending'

  if (!['paid', 'pending'].includes(status)) {
    return res.status(400).json({ message: 'Status must be "paid" or "pending".' });
  }

  try {
    const [salaryRows] = await pool.query('SELECT id FROM salaries WHERE id = ?', [salaryId]);
    if (salaryRows.length === 0) {
      return res.status(404).json({ message: 'Salary record not found.' });
    }

    await pool.query('UPDATE salaries SET status = ? WHERE id = ?', [status, salaryId]);

    res.status(200).json({ success: true, message: `Salary payout status updated to: ${status}` });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get salary history for an employee
 * @route   GET /api/salaries/employee/:employeeId
 * @access  Private (Employee, Admin, HR)
 */
const getEmployeeSalaries = async (req, res, next) => {
  const targetEmployeeId = parseInt(req.params.employeeId);

  // Authorization check: Employees can only view their own payroll records
  if (req.user.role === 'employee' && req.user.employeeId !== targetEmployeeId) {
    return res.status(403).json({ message: 'Access denied: Cannot view other employee salary logs.' });
  }

  try {
    const query = `
      SELECT 
        id,
        basic_salary AS basicSalary,
        allowances,
        deductions,
        net_salary AS netSalary,
        DATE_FORMAT(payment_date, '%Y-%m-%d') AS paymentDate,
        status
      FROM salaries 
      WHERE employee_id = ?
      ORDER BY payment_date DESC
    `;
    const [salaries] = await pool.query(query, [targetEmployeeId]);
    res.status(200).json({ success: true, count: salaries.length, salaries });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllSalaries,
  createSalaryRecord,
  updateSalaryStatus,
  getEmployeeSalaries
};
