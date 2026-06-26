const pool = require('./config/db');
const fs = require('fs');

async function check() {
  const logFile = 'db_counts.txt';
  try {
    const [users] = await pool.query('SELECT COUNT(*) as count FROM users');
    const [employees] = await pool.query('SELECT COUNT(*) as count FROM employees');
    const [attendance] = await pool.query('SELECT COUNT(*) as count FROM attendance');
    const [workHours] = await pool.query('SELECT COUNT(*) as count FROM work_hours');
    const [breakTimes] = await pool.query('SELECT COUNT(*) as count FROM break_times');
    const [leaves] = await pool.query('SELECT COUNT(*) as count FROM leave_requests');
    const [salaries] = await pool.query('SELECT COUNT(*) as count FROM salaries');

    fs.writeFileSync(logFile, JSON.stringify({
      users: users[0].count,
      employees: employees[0].count,
      attendance: attendance[0].count,
      workHours: workHours[0].count,
      breakTimes: breakTimes[0].count,
      leaves: leaves[0].count,
      salaries: salaries[0].count,
      time: new Date().toISOString()
    }, null, 2));
  } catch (err) {
    fs.writeFileSync(logFile, 'Error: ' + err.message);
  } finally {
    await pool.end();
  }
}

check();
