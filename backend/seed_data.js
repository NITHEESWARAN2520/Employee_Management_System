const pool = require('./config/db');
const bcrypt = require('bcryptjs');

async function seed() {
  console.log('🌱 Starting database seeding...');
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Disable foreign key checks to safely truncate
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');

    // 2. Truncate tables
    const tables = ['break_times', 'work_hours', 'attendance', 'leave_requests', 'salaries', 'employees', 'users'];
    for (const table of tables) {
      await conn.query(`TRUNCATE TABLE ${table}`);
      console.log(`✔ Truncated table: ${table}`);
    }

    // 3. Hash the default password "password123"
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    // 4. Seed Users
    // 1 Admin, 1 HR Manager, 17 Employees
    console.log('Inserting users...');
    const usersData = [
      [1, 'admin', passwordHash, 'admin'],
      [2, 'hr_manager', passwordHash, 'hr'],
      [3, 'johndoe', passwordHash, 'employee'],
      [4, 'janesmith', passwordHash, 'employee'],
      [5, 'bobwilson', passwordHash, 'employee'],
      [6, 'nitheeswaran', passwordHash, 'employee'],
      [7, 'alicegreen', passwordHash, 'employee'],
      [8, 'davidmiller', passwordHash, 'employee'],
      [9, 'emmawatson', passwordHash, 'employee'],
      [10, 'frankharris', passwordHash, 'employee'],
      [11, 'gracehopper', passwordHash, 'employee'],
      [12, 'henrycavill', passwordHash, 'employee'],
      [13, 'ivytaylor', passwordHash, 'employee'],
      [14, 'jackryan', passwordHash, 'employee'],
      [15, 'karenpage', passwordHash, 'employee'],
      [16, 'leomessi', passwordHash, 'employee'],
      [17, 'nancywheeler', passwordHash, 'employee'],
      [18, 'olivertwist', passwordHash, 'employee'],
      [19, 'peterparker', passwordHash, 'employee']
    ];

    for (const u of usersData) {
      await conn.query('INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)', u);
    }
    console.log('✔ Users seeded.');

    // 5. Seed Employees Profiles
    console.log('Inserting employee profiles...');
    const employeesData = [
      // id, user_id, name, email, department, salary, contact_info, leave_balance
      [1, 3, 'John Doe', 'john.doe@company.com', 'Engineering', 75000.00, '+919876543210', 21],
      [2, 4, 'Jane Smith', 'jane.smith@company.com', 'Design', 68000.00, '+919876543211', 18],
      [3, 5, 'Bob Wilson', 'bob.wilson@company.com', 'Marketing', 55000.00, '+919876543212', 24],
      [4, 6, 'Nitheeswaran', 'nitheeswaran@company.com', 'Development', 72000.00, '+919876543213', 20],
      [5, 7, 'Alice Green', 'alice.green@company.com', 'Engineering', 70000.00, '+919876543214', 22],
      [6, 8, 'David Miller', 'david.miller@company.com', 'Engineering', 76000.00, '+919876543215', 23],
      [7, 9, 'Emma Watson', 'emma.watson@company.com', 'Design', 64000.00, '+919876543216', 19],
      [8, 10, 'Frank Harris', 'frank.harris@company.com', 'Marketing', 56000.00, '+919876543217', 24],
      [9, 11, 'Grace Hopper', 'grace.hopper@company.com', 'Development', 82000.00, '+919876543218', 21],
      [10, 12, 'Henry Cavill', 'henry.cavill@company.com', 'HR', 61000.00, '+919876543219', 20],
      [11, 13, 'Ivy Taylor', 'ivy.taylor@company.com', 'Finance', 66000.00, '+919876543220', 22],
      [12, 14, 'Jack Ryan', 'jack.ryan@company.com', 'Operations', 59000.00, '+919876543221', 23],
      [13, 15, 'Karen Page', 'karen.page@company.com', 'Support', 51000.00, '+919876543222', 24],
      [14, 16, 'Leo Messi', 'leo.messi@company.com', 'Sales', 68000.00, '+919876543223', 21],
      [15, 17, 'Nancy Wheeler', 'nancy.wheeler@company.com', 'Development', 71000.00, '+919876543224', 22],
      [16, 18, 'Oliver Twist', 'oliver.twist@company.com', 'Marketing', 54000.00, '+919876543225', 24],
      [17, 19, 'Peter Parker', 'peter.parker@company.com', 'Support', 52000.00, '+919876543226', 23]
    ];

    for (const e of employeesData) {
      await conn.query(
        'INSERT INTO employees (id, user_id, name, email, department, salary, contact_info, leave_balance) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        e
      );
    }
    console.log('✔ Employees seeded.');

    // 6. Seed Salary History (May 2026)
    console.log('Inserting salary payout history for May 2026...');
    for (const emp of employeesData) {
      const empId = emp[0];
      const basic = emp[5];
      // Basic is monthly, payout is for May 2026. Let's format allowances and deductions
      const allowances = Math.round((basic * 0.08) * 100) / 100;
      const deductions = Math.round((basic * 0.04) * 100) / 100;
      const net = basic + allowances - deductions;
      await conn.query(
        'INSERT INTO salaries (employee_id, basic_salary, allowances, deductions, net_salary, payment_date, status) VALUES (?, ?, ?, ?, ?, "2026-05-31", "paid")',
        [empId, basic, allowances, deductions, net]
      );
    }
    console.log('✔ Salaries history seeded.');

    // 7. Seed 30 Days of Daily Attendance (from 2026-05-24 to 2026-06-22)
    console.log('Generating 30 days of attendance logs...');
    
    // Generate dates array
    const dates = [];
    let curr = new Date('2026-05-24');
    const end = new Date('2026-06-22');
    while (curr <= end) {
      dates.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
    }

    let attendanceIdCounter = 1;
    for (const dateObj of dates) {
      const dateStr = dateObj.toISOString().split('T')[0];
      const dayOfWeek = dateObj.getDay();

      // Skip weekends (Saturday=6, Sunday=0)
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      for (const emp of employeesData) {
        const empId = emp[0];
        
        // Random status: 90% present, 5% on_leave, 5% absent
        const rand = Math.random();
        let status = 'present';
        if (rand < 0.05) {
          status = 'on_leave';
        } else if (rand < 0.10) {
          status = 'absent';
        }

        if (status === 'present') {
          // Check-in: random between 08:30 and 09:30
          const checkInMin = Math.floor(Math.random() * 60);
          const checkInHour = 8;
          const checkInTime = new Date(`${dateStr}T08:30:00Z`);
          checkInTime.setUTCMinutes(checkInTime.getUTCMinutes() + checkInMin);
          
          // Break start: random between 12:00 and 13:00
          const breakStartMin = Math.floor(Math.random() * 60);
          const breakStartTime = new Date(`${dateStr}T12:00:00Z`);
          breakStartTime.setUTCMinutes(breakStartTime.getUTCMinutes() + breakStartMin);

          // Break duration: random between 30 and 60 minutes
          const breakDurationMin = 30 + Math.floor(Math.random() * 31);
          const breakEndTime = new Date(breakStartTime.getTime() + breakDurationMin * 60000);

          // Check-out: random between 17:00 and 18:30
          const checkOutMin = Math.floor(Math.random() * 90);
          const checkOutTime = new Date(`${dateStr}T17:00:00Z`);
          checkOutTime.setUTCMinutes(checkOutTime.getUTCMinutes() + checkOutMin);

          // Calculate hours
          const totalWorkMs = checkOutTime.getTime() - checkInTime.getTime() - (breakDurationMin * 60000);
          const totalWorkHours = Math.round((totalWorkMs / 3600000) * 100) / 100;
          const totalBreakHours = Math.round((breakDurationMin / 60) * 100) / 100;

          // Insert attendance
          const attId = attendanceIdCounter++;
          await conn.query(
            'INSERT INTO attendance (id, employee_id, date, total_work_hours, total_break_hours, status) VALUES (?, ?, ?, ?, ?, ?)',
            [attId, empId, dateStr, totalWorkHours, totalBreakHours, 'present']
          );

          // Insert work hours session
          // Format for MySQL: YYYY-MM-DD HH:MM:SS
          const formatMySQLTime = (d) => d.toISOString().slice(0, 19).replace('T', ' ');
          
          const workHoursVal = Math.round(((checkOutTime.getTime() - checkInTime.getTime()) / 3600000) * 100) / 100;
          await conn.query(
            'INSERT INTO work_hours (attendance_id, check_in, check_out, hours) VALUES (?, ?, ?, ?)',
            [attId, formatMySQLTime(checkInTime), formatMySQLTime(checkOutTime), workHoursVal]
          );

          // Insert break time
          await conn.query(
            'INSERT INTO break_times (attendance_id, break_start, break_end, hours) VALUES (?, ?, ?, ?)',
            [attId, formatMySQLTime(breakStartTime), formatMySQLTime(breakEndTime), totalBreakHours]
          );

        } else if (status === 'on_leave') {
          // Insert attendance
          const attId = attendanceIdCounter++;
          await conn.query(
            'INSERT INTO attendance (id, employee_id, date, total_work_hours, total_break_hours, status) VALUES (?, ?, ?, 0, 0, ?)',
            [attId, empId, dateStr, 'on_leave']
          );

          // Insert approved leave request
          const leaveTypes = ['sick', 'casual', 'earned'];
          const randType = leaveTypes[Math.floor(Math.random() * leaveTypes.length)];
          await conn.query(
            'INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, reason, status, approved_by) VALUES (?, ?, ?, ?, "Approved personal leave", "approved", 2)',
            [empId, randType, dateStr, dateStr]
          );
        } else {
          // absent
          const attId = attendanceIdCounter++;
          await conn.query(
            'INSERT INTO attendance (id, employee_id, date, total_work_hours, total_break_hours, status) VALUES (?, ?, ?, 0, 0, ?)',
            [attId, empId, dateStr, 'absent']
          );
        }
      }
    }
    console.log('✔ Attendance logs seeded.');

    // 8. Seed Live Attendance for today (June 23, 2026) so dashboard shows live active status
    console.log('Generating live active check-in data for today (June 23, 2026)...');
    const todayStr = '2026-06-23';
    
    // Seed 4 specific check-ins with active statuses
    // John Doe (empId: 1) - Checked in since 09:00:00
    const attId1 = attendanceIdCounter++;
    await conn.query('INSERT INTO attendance (id, employee_id, date, total_work_hours, total_break_hours, status) VALUES (?, 1, ?, 0, 0, "present")', [attId1, todayStr]);
    await conn.query('INSERT INTO work_hours (attendance_id, check_in, check_out, hours) VALUES (?, "2026-06-23 09:00:00", NULL, 0)', [attId1]);

    // Jane Smith (empId: 2) - Checked in since 09:15:00, currently on break since 12:30:00
    const attId2 = attendanceIdCounter++;
    await conn.query('INSERT INTO attendance (id, employee_id, date, total_work_hours, total_break_hours, status) VALUES (?, 2, ?, 0, 0, "present")', [attId2, todayStr]);
    await conn.query('INSERT INTO work_hours (attendance_id, check_in, check_out, hours) VALUES (?, "2026-06-23 09:15:00", NULL, 0)', [attId2]);
    await conn.query('INSERT INTO break_times (attendance_id, break_start, break_end, hours) VALUES (?, "2026-06-23 12:30:00", NULL, 0)', [attId2]);

    // Bob Wilson (empId: 3) - Checked in since 09:30:00
    const attId3 = attendanceIdCounter++;
    await conn.query('INSERT INTO attendance (id, employee_id, date, total_work_hours, total_break_hours, status) VALUES (?, 3, ?, 0, 0, "present")', [attId3, todayStr]);
    await conn.query('INSERT INTO work_hours (attendance_id, check_in, check_out, hours) VALUES (?, "2026-06-23 09:30:00", NULL, 0)', [attId3]);

    // Nitheeswaran (empId: 4) - Checked in since 09:05:00
    const attId4 = attendanceIdCounter++;
    await conn.query('INSERT INTO attendance (id, employee_id, date, total_work_hours, total_break_hours, status) VALUES (?, 4, ?, 0, 0, "present")', [attId4, todayStr]);
    await conn.query('INSERT INTO work_hours (attendance_id, check_in, check_out, hours) VALUES (?, "2026-06-23 09:05:00", NULL, 0)', [attId4]);

    // Let's check in a few more new employees (emp 5, 6, 7) to make it look even more active!
    for (let empId = 5; empId <= 8; empId++) {
      const attId = attendanceIdCounter++;
      await conn.query('INSERT INTO attendance (id, employee_id, date, total_work_hours, total_break_hours, status) VALUES (?, ?, ?, 0, 0, "present")', [attId, empId, todayStr]);
      await conn.query('INSERT INTO work_hours (attendance_id, check_in, check_out, hours) VALUES (?, "2026-06-23 09:20:00", NULL, 0)', [attId]);
    }

    // Put a pending leave request from employee 9
    await conn.query(
      'INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, reason, status, approved_by) VALUES (9, "casual", "2026-06-24", "2026-06-25", "Family gathering celebration", "pending", NULL)'
    );

    // Re-enable foreign key checks
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    await conn.commit();
    console.log('🚀 Database seeding completed successfully!');
  } catch (err) {
    await conn.rollback();
    console.error('❌ Database seeding failed:', err);
  } finally {
    conn.release();
  }
}

seed().then(() => pool.end());
