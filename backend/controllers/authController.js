const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// Helper function to sign JWT tokens
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '24h'
  });
};

/**
 * @desc    Register a new user (Admins/HR can register any user; employees can signup directly)
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  const { username, password, role, name, email, department, salary, contactInfo } = req.body;

  // Validate request inputs
  if (!username || !password || !role) {
    return res.status(400).json({ message: 'Username, password and role are required' });
  }

  // Ensure employee role comes with its profile details
  if (role === 'employee' && (!name || !email || !department || !salary)) {
    return res.status(400).json({ message: 'Profile details (name, email, department, salary) are required for employees' });
  }

  // Obtain a database connection for executing a transaction
  const conn = await pool.getConnection();

  try {
    // Start ACID transaction
    await conn.beginTransaction();

    // Check if username already exists
    const [existingUsers] = await conn.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUsers.length > 0) {
      await conn.rollback();
      return res.status(400).json({ message: 'Username is already taken' });
    }

    // Check if email already exists if creating an employee
    if (role === 'employee') {
      const [existingEmails] = await conn.query('SELECT id FROM employees WHERE email = ?', [email]);
      if (existingEmails.length > 0) {
        await conn.rollback();
        return res.status(400).json({ message: 'Email is already in use by another employee' });
      }
    }

    // Hash password with salt rounds = 10
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user credential record
    const [userResult] = await conn.query(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, hashedPassword, role]
    );
    const userId = userResult.insertId;

    let employeeId = null;

    // Create employee profile if user is registered with 'employee' role
    if (role === 'employee') {
      const [empResult] = await conn.query(
        'INSERT INTO employees (user_id, name, email, department, salary, contact_info, leave_balance) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, name, email, department, parseFloat(salary), contactInfo || null, 24]
      );
      employeeId = empResult.insertId;
    }

    // Commit changes to database
    await conn.commit();

    // Generate JWT token
    const token = generateToken(userId);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: userId,
        username,
        role,
        employeeId
      }
    });

  } catch (error) {
    // Rollback changes on database failure
    await conn.rollback();
    next(error);
  } finally {
    // Release connection back to pool
    conn.release();
  }
};

/**
 * @desc    Authenticate user and get JWT
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  const { username, password } = req.body;
  const loginId = typeof username === 'string' ? username.trim() : '';
  const loginPassword = typeof password === 'string' ? password.trim() : '';

  if (!loginId || !loginPassword) {
    return res.status(400).json({ message: 'Please provide username and password' });
  }

  try {
    // Allow sign-in with either the account username or the employee email.
    const [users] = await pool.query(
      `SELECT u.*
       FROM users u
       LEFT JOIN employees e ON e.user_id = u.id
       WHERE u.username = ? OR e.email = ?`,
      [loginId, loginId]
    );
    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = users[0];

    // Compare input password with stored bcrypt hash
    const isMatch = await bcrypt.compare(loginPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Compile login metadata based on user role
    let employeeData = null;
    if (user.role === 'employee') {
      const [employees] = await pool.query(
        'SELECT id, name, email, department, salary, leave_balance, contact_info FROM employees WHERE user_id = ?',
        [user.id]
      );
      if (employees.length > 0) {
        employeeData = employees[0];
      }
    }

    // Sign authentication token
    const token = generateToken(user.id);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        ...(employeeData && { employee: employeeData })
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current logged-in user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user
  });
};

module.exports = { register, login, getMe };
