const jwt = require('jsonwebtoken');
const pool = require('../config/db');

/**
 * Protect routes by checking for valid JWT authorization header
 */
const protect = async (req, res, next) => {
  let token;

  // Check if Bearer token is provided in the headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Extract token from format: Bearer <token>
      token = req.headers.authorization.split(' ')[1];

      // Verify and decode token payload
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Fetch basic user information from MySQL
      const [rows] = await pool.query(
        'SELECT id, username, role FROM users WHERE id = ?',
        [decoded.id]
      );

      if (rows.length === 0) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      const user = rows[0];
      req.user = {
        id: user.id,
        username: user.username,
        role: user.role
      };

      // If the user role is 'employee', fetch their corresponding Employee ID
      if (user.role === 'employee') {
        const [empRows] = await pool.query(
          'SELECT id, name, department, salary, leave_balance FROM employees WHERE user_id = ?',
          [user.id]
        );
        if (empRows.length > 0) {
          req.user.employeeId = empRows[0].id;
          req.user.name = empRows[0].name;
          req.user.department = empRows[0].department;
          req.user.salary = empRows[0].salary;
          req.user.leaveBalance = empRows[0].leave_balance;
        }
      }

      next();
    } catch (error) {
      console.error('JWT Verification Error:', error.message);
      return res.status(401).json({ message: 'Not authorized, token failed or expired' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

/**
 * Restrict route access to specific user roles
 * @param {...string} roles - List of allowed roles: 'admin', 'hr', 'employee'
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Forbidden: Access restricted to roles [${roles.join(', ')}]. Current role: '${req.user ? req.user.role : 'none'}'`
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
