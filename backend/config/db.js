const mysql = require('mysql2/promise');
require('dotenv').config();

const DEFAULT_PASSWORD_HASH = '$2a$10$dL/uGT5KSFMa9IU8685YnOXcS2SOeUni/9mZtBMCruD0bDcRdkxHO';
const LEGACY_DEFAULT_PASSWORD_HASH = '$2a$10$y582XN93Vz4C9r7d8dG4uOp1R3P8vG6sZ9k0l4x7f.w2b1c0q1h3G';

// Define database connection pool settings using environment variables
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'employee_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+00:00' // Store timestamps consistently in UTC
});

// Immediately test connection during application startup
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✔ Successfully connected to MySQL database: ' + (process.env.DB_NAME || 'employee_db'));

    // Repair the known bad default seed hash on existing databases.
    await connection.query(
      `UPDATE users
       SET password = ?
       WHERE username IN ('admin', 'hr_manager', 'johndoe', 'janesmith', 'bobwilson')
         AND password = ?`,
      [DEFAULT_PASSWORD_HASH, LEGACY_DEFAULT_PASSWORD_HASH]
    );

    connection.release();
  } catch (error) {
    console.error('❌ Failed to connect to MySQL database:', error.message);
    console.error('👉 Please make sure your MySQL server is running, the database exists, and credentials in the .env file are correct.');
  }
})();

module.exports = pool;
