const pool = require('../config/db');

/**
 * @desc    Submit a leave request
 * @route   POST /api/leaves/request
 * @access  Private (Employee)
 */
const requestLeave = async (req, res, next) => {
  const { leaveType, startDate, endDate, reason } = req.body;
  const employeeId = req.user.employeeId;

  if (!leaveType || !startDate || !endDate || !reason) {
    return res.status(400).json({ message: 'Please provide all required fields' });
  }

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      return res.status(400).json({ message: 'End date cannot be earlier than start date.' });
    }

    // Calculate requested leave days: (Difference in ms) / (1000ms * 60s * 60m * 24h) + 1 day
    const timeDiff = end.getTime() - start.getTime();
    const leaveDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

    // Check if the employee has sufficient leave balance
    const [empRows] = await pool.query(
      'SELECT leave_balance FROM employees WHERE id = ?',
      [employeeId]
    );

    if (empRows.length === 0) {
      return res.status(404).json({ message: 'Employee profile not found.' });
    }

    const currentBalance = empRows[0].leave_balance;
    if (currentBalance < leaveDays) {
      return res.status(400).json({ 
        message: `Insufficient leave balance. Requested: ${leaveDays} days, Available: ${currentBalance} days.` 
      });
    }

    // Insert pending leave request
    await pool.query(
      'INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, reason, status) VALUES (?, ?, ?, ?, ?, "pending")',
      [employeeId, leaveType, startDate, endDate, reason]
    );

    res.status(201).json({ 
      success: true, 
      message: `Leave request for ${leaveDays} days submitted successfully.` 
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve or Reject a leave request (HR or Admin)
 * @route   PUT /api/leaves/approve/:id
 * @access  Private (HR, Admin)
 */
const approveLeave = async (req, res, next) => {
  const requestId = req.params.id;
  const { status } = req.body; // Expects 'approved' or 'rejected'
  const approverUserId = req.user.id;

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status. Must be "approved" or "rejected"' });
  }

  const conn = await pool.getConnection();

  try {
    // Start ACID database transaction
    await conn.beginTransaction();

    // 1. Fetch leave request details
    const [requestRows] = await conn.query(
      'SELECT * FROM leave_requests WHERE id = ?',
      [requestId]
    );

    if (requestRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Leave request not found.' });
    }

    const leaveRequest = requestRows[0];

    // Ensure request is still pending decision
    if (leaveRequest.status !== 'pending') {
      await conn.rollback();
      return res.status(400).json({ message: 'This leave request has already been processed.' });
    }

    const start = new Date(leaveRequest.start_date);
    const end = new Date(leaveRequest.end_date);
    // Calculate date range days
    const timeDiff = end.getTime() - start.getTime();
    const leaveDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

    // -----------------------------------------------------------------
    // LEAVE APPROVAL TRANSACTION LOGIC
    // -----------------------------------------------------------------
    if (status === 'approved') {
      // A. Re-verify employee's current leave balance inside the transaction
      const [empRows] = await conn.query(
        'SELECT leave_balance FROM employees WHERE id = ? FOR UPDATE', // 'FOR UPDATE' locks row to prevent race conditions
        [leaveRequest.employee_id]
      );

      const currentBalance = empRows[0].leave_balance;
      if (currentBalance < leaveDays) {
        await conn.rollback();
        return res.status(400).json({ 
          message: `Cannot approve. Employee leave balance (${currentBalance} days) is less than requested leave (${leaveDays} days).` 
        });
      }

      // B. Deduct leave days from employee's balance
      await conn.query(
        'UPDATE employees SET leave_balance = leave_balance - ? WHERE id = ?',
        [leaveDays, leaveRequest.employee_id]
      );

      // C. Automatically insert "on_leave" entries into the attendance log for each date in the range
      let currentDate = new Date(start);
      while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        // Insert or ignore if record exists (e.g. employee already had an attendance entry)
        await conn.query(
          `INSERT INTO attendance (employee_id, date, total_work_hours, total_break_hours, status) 
           VALUES (?, ?, 0.00, 0.00, 'on_leave')
           ON DUPLICATE KEY UPDATE status = 'on_leave'`,
          [leaveRequest.employee_id, dateStr]
        );
        
        // Increment date loop by 1 day
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    // D. Update the status and reviewer ID on the leave request record
    await conn.query(
      'UPDATE leave_requests SET status = ?, approved_by = ? WHERE id = ?',
      [status, approverUserId, requestId]
    );

    // Commit all changes successfully
    await conn.commit();

    res.status(200).json({ 
      success: true, 
      message: `Leave request has been ${status}.` 
    });

  } catch (error) {
    // Rollback transaction to maintain data integrity in case of any code crashes
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
};

/**
 * @desc    Get all leave requests (for HR and Admins)
 * @route   GET /api/leaves
 * @access  Private (HR, Admin)
 */
const getLeaveRequests = async (req, res, next) => {
  try {
    const query = `
      SELECT 
        lr.id,
        lr.employee_id AS employeeId,
        e.name,
        e.department,
        lr.leave_type AS leaveType,
        DATE_FORMAT(lr.start_date, '%Y-%m-%d') AS startDate,
        DATE_FORMAT(lr.end_date, '%Y-%m-%d') AS endDate,
        lr.reason,
        lr.status,
        u.username AS approvedByUsername,
        lr.created_at AS createdAt
      FROM leave_requests lr
      JOIN employees e ON lr.employee_id = e.id
      LEFT JOIN users u ON lr.approved_by = u.id
      ORDER BY lr.created_at DESC
    `;

    const [requests] = await pool.query(query);
    res.status(200).json({ success: true, count: requests.length, requests });
  } catch (error) {
    next(error);
  }
};

module.exports = { requestLeave, approveLeave, getLeaveRequests };
