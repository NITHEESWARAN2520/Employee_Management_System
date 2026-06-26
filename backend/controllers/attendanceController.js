const pool = require('../config/db');

/**
 * Helper to get or create daily attendance record for an employee
 * @param {number} employeeId - ID of employee
 * @param {string} todayDate - 'YYYY-MM-DD' formatted string
 */
const getOrCreateAttendance = async (employeeId, todayDate) => {
  // Check if daily record already exists
  const [rows] = await pool.query(
    'SELECT id FROM attendance WHERE employee_id = ? AND date = ?',
    [employeeId, todayDate]
  );
  
  if (rows.length > 0) {
    return rows[0].id;
  }

  // Insert a new daily attendance summary record if not found
  const [result] = await pool.query(
    'INSERT INTO attendance (employee_id, date, total_work_hours, total_break_hours, status) VALUES (?, ?, 0.00, 0.00, "present")',
    [employeeId, todayDate]
  );
  return result.insertId;
};

/**
 * @desc    Employee Check-in
 * @route   POST /api/attendance/check-in
 * @access  Private (Employee)
 */
const checkIn = async (req, res, next) => {
  const employeeId = req.user.employeeId;
  const todayDate = new Date().toISOString().split('T')[0];

  try {
    const attendanceId = await getOrCreateAttendance(employeeId, todayDate);

    // Ensure the employee is not already checked in (active session with null check_out)
    const [activeSessions] = await pool.query(
      'SELECT id FROM work_hours WHERE attendance_id = ? AND check_out IS NULL',
      [attendanceId]
    );

    if (activeSessions.length > 0) {
      return res.status(400).json({ message: 'You are already checked in.' });
    }

    // Insert a new work session with the current timestamp
    await pool.query(
      'INSERT INTO work_hours (attendance_id, check_in) VALUES (?, CURRENT_TIMESTAMP)',
      [attendanceId]
    );

    res.status(200).json({ success: true, message: 'Check-in successful.' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Employee Check-out
 * @route   POST /api/attendance/check-out
 * @access  Private (Employee)
 */
const checkOut = async (req, res, next) => {
  const employeeId = req.user.employeeId;
  const todayDate = new Date().toISOString().split('T')[0];

  try {
    // 1. Fetch current daily attendance record
    const [attRows] = await pool.query(
      'SELECT id FROM attendance WHERE employee_id = ? AND date = ?',
      [employeeId, todayDate]
    );

    if (attRows.length === 0) {
      return res.status(400).json({ message: 'No check-in record found for today.' });
    }

    const attendanceId = attRows[0].id;

    // 2. Fetch the active work session (where check_out is NULL)
    const [activeSessions] = await pool.query(
      'SELECT id, check_in FROM work_hours WHERE attendance_id = ? AND check_out IS NULL',
      [attendanceId]
    );

    if (activeSessions.length === 0) {
      return res.status(400).json({ message: 'You are not checked in, or have already checked out.' });
    }

    const session = activeSessions[0];
    const checkInTime = new Date(session.check_in);
    const checkOutTime = new Date();

    // -----------------------------------------------------------------
    // WORK HOURS CALCULATION LOGIC:
    // 1. Compute time difference in milliseconds: checkout - checkin
    // 2. Convert to hours: milliseconds / (1000ms * 60s * 60m)
    // 3. Float rounding: to 2 decimal places
    // -----------------------------------------------------------------
    const elapsedMs = checkOutTime.getTime() - checkInTime.getTime();
    const sessionHours = parseFloat((elapsedMs / (1000 * 60 * 60)).toFixed(2));

    // Update active work session with checkout timestamp and calculated hours
    await pool.query(
      'UPDATE work_hours SET check_out = ?, hours = ? WHERE id = ?',
      [checkOutTime, sessionHours, session.id]
    );

    // 3. Recalculate daily total work hours from all work sessions today
    const [allSessions] = await pool.query(
      'SELECT SUM(hours) AS total FROM work_hours WHERE attendance_id = ?',
      [attendanceId]
    );
    const newTotalWorkHours = parseFloat(allSessions[0].total || 0).toFixed(2);

    // Update main attendance record
    await pool.query(
      'UPDATE attendance SET total_work_hours = ? WHERE id = ?',
      [newTotalWorkHours, attendanceId]
    );

    res.status(200).json({ 
      success: true, 
      message: 'Check-out successful.', 
      sessionHours, 
      totalWorkHours: newTotalWorkHours 
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Employee Break Start
 * @route   POST /api/attendance/break-start
 * @access  Private (Employee)
 */
const breakStart = async (req, res, next) => {
  const employeeId = req.user.employeeId;
  const todayDate = new Date().toISOString().split('T')[0];

  try {
    const [attRows] = await pool.query(
      'SELECT id FROM attendance WHERE employee_id = ? AND date = ?',
      [employeeId, todayDate]
    );

    if (attRows.length === 0) {
      return res.status(400).json({ message: 'Please check in first before starting a break.' });
    }

    const attendanceId = attRows[0].id;

    // Check if employee is currently checked in (has active work_hours session)
    const [activeSessions] = await pool.query(
      'SELECT id FROM work_hours WHERE attendance_id = ? AND check_out IS NULL',
      [attendanceId]
    );
    if (activeSessions.length === 0) {
      return res.status(400).json({ message: 'Must be actively checked in to take a break.' });
    }

    // Check if already on break
    const [activeBreaks] = await pool.query(
      'SELECT id FROM break_times WHERE attendance_id = ? AND break_end IS NULL',
      [attendanceId]
    );
    if (activeBreaks.length > 0) {
      return res.status(400).json({ message: 'You are already on a break.' });
    }

    // Insert new break session
    await pool.query(
      'INSERT INTO break_times (attendance_id, break_start) VALUES (?, CURRENT_TIMESTAMP)',
      [attendanceId]
    );

    res.status(200).json({ success: true, message: 'Break started.' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Employee Break End
 * @route   POST /api/attendance/break-end
 * @access  Private (Employee)
 */
const breakEnd = async (req, res, next) => {
  const employeeId = req.user.employeeId;
  const todayDate = new Date().toISOString().split('T')[0];

  try {
    const [attRows] = await pool.query(
      'SELECT id FROM attendance WHERE employee_id = ? AND date = ?',
      [employeeId, todayDate]
    );

    if (attRows.length === 0) {
      return res.status(400).json({ message: 'No break session found for today.' });
    }

    const attendanceId = attRows[0].id;

    // Fetch the active break record
    const [activeBreaks] = await pool.query(
      'SELECT id, break_start FROM break_times WHERE attendance_id = ? AND break_end IS NULL',
      [attendanceId]
    );

    if (activeBreaks.length === 0) {
      return res.status(400).json({ message: 'You are not currently on a break.' });
    }

    const breakRecord = activeBreaks[0];
    const breakStart = new Date(breakRecord.break_start);
    const breakEnd = new Date();

    // -----------------------------------------------------------------
    // BREAK DURATION CALCULATION LOGIC:
    // 1. Calculate time difference in milliseconds: breakEnd - breakStart
    // 2. Convert to hours: milliseconds / (1000 * 60 * 60)
    // 3. Round to 2 decimal places
    // -----------------------------------------------------------------
    const elapsedMs = breakEnd.getTime() - breakStart.getTime();
    const breakHours = parseFloat((elapsedMs / (1000 * 60 * 60)).toFixed(2));

    // Update break record in database
    await pool.query(
      'UPDATE break_times SET break_end = ?, hours = ? WHERE id = ?',
      [breakEnd, breakHours, breakRecord.id]
    );

    // Sum up all break sessions for today
    const [allBreaks] = await pool.query(
      'SELECT SUM(hours) AS total FROM break_times WHERE attendance_id = ?',
      [attendanceId]
    );
    const newTotalBreakHours = parseFloat(allBreaks[0].total || 0).toFixed(2);

    // Update main attendance record
    await pool.query(
      'UPDATE attendance SET total_break_hours = ? WHERE id = ?',
      [newTotalBreakHours, attendanceId]
    );

    res.status(200).json({ 
      success: true, 
      message: 'Break ended successfully.', 
      breakHours, 
      totalBreakHours: newTotalBreakHours 
    });

  } catch (error) {
    next(error);
  }
};

module.exports = { checkIn, checkOut, breakStart, breakEnd };
