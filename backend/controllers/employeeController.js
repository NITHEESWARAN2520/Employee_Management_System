const pool = require('../config/db');
const bcrypt = require('bcryptjs');

/**
 * @desc    Get all employees with their profile details and total leave taken
 * @route   GET /api/employees
 * @access  Private (Admin, HR)
 */
const getAllEmployees = async (req, res, next) => {
  try {
    // SQL query joins employees with users and sums up approved leave days
    const query = `
      SELECT 
        e.id, 
        e.name, 
        e.email, 
        e.department, 
        e.salary, 
        e.contact_info AS contactInfo, 
        e.leave_balance AS leaveBalance,
        u.username,
        COALESCE(
          (SELECT SUM(DATEDIFF(end_date, start_date) + 1) 
           FROM leave_requests 
           WHERE employee_id = e.id AND status = 'approved'), 
          0
        ) AS leaveTaken
      FROM employees e
      JOIN users u ON e.user_id = u.id
      ORDER BY e.id ASC
    `;

    const [employees] = await pool.query(query);
    res.status(200).json({ success: true, count: employees.length, employees });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get dashboard metrics, history, and status for the logged-in employee
 * @route   GET /api/employees/dashboard
 * @access  Private (Employee)
 */
const getEmployeeDashboard = async (req, res, next) => {
  const employeeId = req.user.employeeId;

  if (!employeeId) {
    return res.status(400).json({ message: 'User is not linked to an employee profile' });
  }

  try {
    // 1. Fetch personal details
    const [empRows] = await pool.query(
      'SELECT * FROM employees WHERE id = ?',
      [employeeId]
    );
    const employee = empRows[0];

    // 2. Fetch current month's attendance logs (with work sessions and breaks)
    const attendanceQuery = `
      SELECT 
        a.id,
        a.date,
        a.total_work_hours AS totalWorkHours,
        a.total_break_hours AS totalBreakHours,
        a.status,
        -- Subqueries to get list of sessions
        (SELECT JSON_ARRAYAGG(
                  JSON_OBJECT(
                    'checkIn', DATE_FORMAT(wh.check_in, '%Y-%m-%d %H:%i:%s'),
                    'checkOut', DATE_FORMAT(wh.check_out, '%Y-%m-%d %H:%i:%s'),
                    'hours', wh.hours
                  )
                )
         FROM work_hours wh 
         WHERE wh.attendance_id = a.id) AS sessions,
        
        (SELECT JSON_ARRAYAGG(
                  JSON_OBJECT(
                    'breakStart', DATE_FORMAT(bt.break_start, '%Y-%m-%d %H:%i:%s'),
                    'breakEnd', DATE_FORMAT(bt.break_end, '%Y-%m-%d %H:%i:%s'),
                    'hours', bt.hours
                  )
                )
         FROM break_times bt 
         WHERE bt.attendance_id = a.id) AS breaks
      FROM attendance a
      WHERE a.employee_id = ? AND MONTH(a.date) = MONTH(CURRENT_DATE()) AND YEAR(a.date) = YEAR(CURRENT_DATE())
      ORDER BY a.date DESC
    `;
    const [attendance] = await pool.query(attendanceQuery, [employeeId]);

    // 3. Fetch leave history
    const [leaves] = await pool.query(
      'SELECT id, leave_type AS leaveType, start_date AS startDate, end_date AS endDate, reason, status, created_at AS createdAt FROM leave_requests WHERE employee_id = ? ORDER BY created_at DESC',
      [employeeId]
    );

    // 4. Fetch salary history
    const [salaries] = await pool.query(
      'SELECT id, basic_salary AS basicSalary, allowances, deductions, net_salary AS netSalary, payment_date AS paymentDate, status FROM salaries WHERE employee_id = ? ORDER BY payment_date DESC',
      [employeeId]
    );

    // 5. Check active status today (checked in? on break?)
    const today = new Date().toISOString().split('T')[0];
    const [todayAttendance] = await pool.query(
      'SELECT id FROM attendance WHERE employee_id = ? AND date = ?',
      [employeeId, today]
    );

    let activeStatus = { checkedIn: false, onBreak: false, attendanceId: null };
    if (todayAttendance.length > 0) {
      const attId = todayAttendance[0].id;
      activeStatus.attendanceId = attId;

      // Check for active work hour session (no check_out timestamp)
      const [activeSession] = await pool.query(
        'SELECT id, DATE_FORMAT(check_in, "%Y-%m-%d %H:%i:%s") AS checkIn FROM work_hours WHERE attendance_id = ? AND check_out IS NULL',
        [attId]
      );
      if (activeSession.length > 0) {
        activeStatus.checkedIn = true;
        activeStatus.checkInTime = activeSession[0].checkIn;
      }

      // Check for active break session (no break_end timestamp)
      const [activeBreak] = await pool.query(
        'SELECT id, DATE_FORMAT(break_start, "%Y-%m-%d %H:%i:%s") AS breakStart FROM break_times WHERE attendance_id = ? AND break_end IS NULL',
        [attId]
      );
      if (activeBreak.length > 0) {
        activeStatus.onBreak = true;
        activeStatus.breakStartTime = activeBreak[0].breakStart;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        employee,
        attendance,
        leaves,
        salaries,
        activeStatus
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get global statistics, trends, and charts for HR and Admins
 * @route   GET /api/employees/admin-dashboard
 * @access  Private (Admin, HR)
 */
const getAdminDashboard = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // 1. Core Summary Metrics
    const [[{ totalEmployees }]] = await pool.query('SELECT COUNT(*) AS totalEmployees FROM employees');
    const [[{ pendingLeaves }]] = await pool.query('SELECT COUNT(*) AS pendingLeaves FROM leave_requests WHERE status = "pending"');
    
    // Total checked in today
    const [[{ checkedInToday }]] = await pool.query(
      `SELECT COUNT(DISTINCT a.employee_id) AS checkedInToday 
       FROM attendance a 
       JOIN work_hours wh ON wh.attendance_id = a.id
       WHERE a.date = ?`,
      [today]
    );

    // Employees currently on break
    const [[{ onBreakCount }]] = await pool.query(
      `SELECT COUNT(DISTINCT a.employee_id) AS onBreakCount 
       FROM attendance a 
       JOIN break_times bt ON bt.attendance_id = a.id
       WHERE a.date = ? AND bt.break_end IS NULL`,
      [today]
    );

    // 2. Attendance Trend (Last 7 days of attendance counts)
    const trendQuery = `
      SELECT 
        DATE_FORMAT(d.date, '%Y-%m-%d') AS date,
        COUNT(a.id) AS presentCount
      FROM (
        SELECT CURRENT_DATE() - INTERVAL (a.a) DAY AS date
        FROM (SELECT 0 AS a UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6) AS a
      ) d
      LEFT JOIN attendance a ON d.date = a.date AND a.status = 'present'
      GROUP BY d.date
      ORDER BY d.date ASC
    `;
    const [attendanceTrend] = await pool.query(trendQuery);

    // 3. Hourly Check-in Patterns (Distribution of check-in times by hour of the day)
    const hourlyDistributionQuery = `
      SELECT 
        HOUR(check_in) AS hourVal, 
        COUNT(*) AS checkInCount 
      FROM work_hours 
      GROUP BY HOUR(check_in) 
      ORDER BY hourVal ASC
    `;
    const [hourlyPattern] = await pool.query(hourlyDistributionQuery);

    // 4. Pending Leave requests list
    const leavesQuery = `
      SELECT 
        lr.id,
        e.name,
        e.department,
        lr.leave_type AS leaveType,
        DATE_FORMAT(lr.start_date, '%Y-%m-%d') AS startDate,
        DATE_FORMAT(lr.end_date, '%Y-%m-%d') AS endDate,
        lr.reason,
        lr.status
      FROM leave_requests lr
      JOIN employees e ON lr.employee_id = e.id
      WHERE lr.status = 'pending'
      ORDER BY lr.created_at ASC
    `;
    const [pendingLeaveRequests] = await pool.query(leavesQuery);

    res.status(200).json({
      success: true,
      metrics: {
        totalEmployees,
        pendingLeaves,
        checkedInToday,
        onBreakCount,
        attendanceRate: totalEmployees > 0 ? Math.round((checkedInToday / totalEmployees) * 100) : 0
      },
      charts: {
        attendanceTrend,
        hourlyPattern
      },
      pendingLeaveRequests
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new employee profile (Admins/HR)
 * @route   POST /api/employees
 * @access  Private (Admin, HR)
 */
const createEmployee = async (req, res, next) => {
  const { username, password, name, email, department, salary, contactInfo, role } = req.body;

  if (!username || !password || !name || !email || !department || !salary) {
    return res.status(400).json({ message: 'Please provide all required fields' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Check username availability
    const [userCheck] = await conn.query('SELECT id FROM users WHERE username = ?', [username]);
    if (userCheck.length > 0) {
      await conn.rollback();
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Check email availability
    const [emailCheck] = await conn.query('SELECT id FROM employees WHERE email = ?', [email]);
    if (emailCheck.length > 0) {
      await conn.rollback();
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user login credential
    const [userResult] = await conn.query(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, hashedPassword, role || 'employee']
    );
    const userId = userResult.insertId;

    // Create employee profile
    const [empResult] = await conn.query(
      'INSERT INTO employees (user_id, name, email, department, salary, contact_info, leave_balance) VALUES (?, ?, ?, ?, ?, ?, 24)',
      [userId, name, email, department, parseFloat(salary), contactInfo || null]
    );

    await conn.commit();

    res.status(201).json({
      success: true,
      message: 'Employee profile created successfully',
      data: {
        id: empResult.insertId,
        userId,
        name,
        email,
        department,
        salary,
        role: role || 'employee'
      }
    });

  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
};

/**
 * @desc    Update employee profile details
 * @route   PUT /api/employees/:id
 * @access  Private (Admin, HR)
 */
const updateEmployee = async (req, res, next) => {
  const { name, department, salary, contactInfo, leaveBalance } = req.body;
  const employeeId = req.params.id;

  try {
    // Confirm profile existence
    const [empCheck] = await pool.query('SELECT user_id FROM employees WHERE id = ?', [employeeId]);
    if (empCheck.length === 0) {
      return res.status(404).json({ message: 'Employee profile not found' });
    }

    // Update details in DB
    await pool.query(
      `UPDATE employees 
       SET name = COALESCE(?, name), 
           department = COALESCE(?, department), 
           salary = COALESCE(?, salary), 
           contact_info = COALESCE(?, contact_info), 
           leave_balance = COALESCE(?, leave_balance) 
       WHERE id = ?`,
      [name, department, salary ? parseFloat(salary) : null, contactInfo, leaveBalance, employeeId]
    );

    res.status(200).json({ success: true, message: 'Employee updated successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete employee profile and credentials
 * @route   DELETE /api/employees/:id
 * @access  Private (Admin)
 */
const deleteEmployee = async (req, res, next) => {
  const employeeId = req.params.id;
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // Fetch user_id of employee to remove authentication credentials as well
    const [empRows] = await conn.query('SELECT user_id FROM employees WHERE id = ?', [employeeId]);
    if (empRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Employee not found' });
    }
    const userId = empRows[0].user_id;

    // Delete user (cascade removes employee profile as defined in SQL schema)
    await conn.query('DELETE FROM users WHERE id = ?', [userId]);

    await conn.commit();
    res.status(200).json({ success: true, message: 'Employee and login credentials deleted successfully' });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
};

module.exports = {
  getAllEmployees,
  getEmployeeDashboard,
  getAdminDashboard,
  createEmployee,
  updateEmployee,
  deleteEmployee
};
