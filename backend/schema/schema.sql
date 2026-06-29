-- Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS employee_db;
USE employee_db;

-- -------------------------------------------------------------
-- 1. USERS TABLE (Stores authentication and role details)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'hr', 'employee') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- 2. EMPLOYEES TABLE (Stores profile, payroll rate, and leave balances)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    department VARCHAR(100) NOT NULL,
    salary DECIMAL(10, 2) NOT NULL,
    contact_info VARCHAR(20),
    leave_balance INT DEFAULT 24,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- 3. ATTENDANCE TABLE (Daily log summary of present status and total hours)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT,
    date DATE NOT NULL,
    total_work_hours DECIMAL(5, 2) DEFAULT 0.00,
    total_break_hours DECIMAL(5, 2) DEFAULT 0.00,
    status ENUM('present', 'absent', 'on_leave') DEFAULT 'present',
    UNIQUE KEY emp_date_unique (employee_id, date),
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- 4. WORK HOURS TABLE (Captures multiple check-in/check-out sessions in a day)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS work_hours (
    id INT AUTO_INCREMENT PRIMARY KEY,
    attendance_id INT,
    check_in TIMESTAMP NOT NULL,
    check_out TIMESTAMP NULL,
    hours DECIMAL(5, 2) DEFAULT 0.00,
    FOREIGN KEY (attendance_id) REFERENCES attendance(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- 5. BREAK TIMES TABLE (Captures multiple break-start/break-end intervals in a day)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS break_times (
    id INT AUTO_INCREMENT PRIMARY KEY,
    attendance_id INT,
    break_start TIMESTAMP NOT NULL,
    break_end TIMESTAMP NULL,
    hours DECIMAL(5, 2) DEFAULT 0.00,
    FOREIGN KEY (attendance_id) REFERENCES attendance(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- 6. LEAVE REQUESTS TABLE (Submission records and approval status)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leave_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT,
    leave_type ENUM('sick', 'casual', 'earned') NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    approved_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- 7. SALARIES TABLE (Tracks payroll payouts)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS salaries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT,
    basic_salary DECIMAL(10, 2) NOT NULL,
    allowances DECIMAL(10, 2) DEFAULT 0.00,
    deductions DECIMAL(10, 2) DEFAULT 0.00,
    net_salary DECIMAL(10, 2) NOT NULL,
    payment_date DATE,
    status ENUM('paid', 'pending') DEFAULT 'pending',
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- SEED DATA (Default passwords are 'password123' hashed with bcrypt)
-- HASH: $2a$10$dL/uGT5KSFMa9IU8685YnOXcS2SOeUni/9mZtBMCruD0bDcRdkxHO
-- -------------------------------------------------------------

-- 1. Insert Users (1 Admin, 1 HR, 4 Employees)
INSERT IGNORE INTO users (id, username, password, role) VALUES
(1, 'admin', '$2a$10$dL/uGT5KSFMa9IU8685YnOXcS2SOeUni/9mZtBMCruD0bDcRdkxHO', 'admin'),
(2, 'hr_manager', '$2a$10$dL/uGT5KSFMa9IU8685YnOXcS2SOeUni/9mZtBMCruD0bDcRdkxHO', 'hr'),
(3, 'johndoe', '$2a$10$dL/uGT5KSFMa9IU8685YnOXcS2SOeUni/9mZtBMCruD0bDcRdkxHO', 'employee'),
(4, 'janesmith', '$2a$10$dL/uGT5KSFMa9IU8685YnOXcS2SOeUni/9mZtBMCruD0bDcRdkxHO', 'employee'),
(5, 'bobwilson', '$2a$10$dL/uGT5KSFMa9IU8685YnOXcS2SOeUni/9mZtBMCruD0bDcRdkxHO', 'employee'),
(6, 'nitheeswaran', '$2a$10$dL/uGT5KSFMa9IU8685YnOXcS2SOeUni/9mZtBMCruD0bDcRdkxHO', 'employee');

-- Repair existing default users if the database was created with the old hash.
UPDATE users
SET password = '$2a$10$dL/uGT5KSFMa9IU8685YnOXcS2SOeUni/9mZtBMCruD0bDcRdkxHO'
WHERE username IN ('admin', 'hr_manager', 'johndoe', 'janesmith', 'bobwilson', 'nitheeswaran');

-- 2. Insert Employees profiles (Admin/HR can also have profiles, but employees are required)
INSERT IGNORE INTO employees (id, user_id, name, email, department, salary, contact_info, leave_balance) VALUES
(1, 3, 'John Doe', 'john.doe@company.com', 'Engineering', 75000.00, '+1234567890', 21),
(2, 4, 'Jane Smith', 'jane.smith@company.com', 'Design', 68000.00, '+1987654321', 18),
(3, 5, 'Bob Wilson', 'bob.wilson@company.com', 'Marketing', 55000.00, '+1555019283', 24),
(4, 6, 'Nitheeswaran', 'nitheeswaran@company.com', 'Development', 72000.00, '+1555098765', 20);

-- 3. Insert Attendance history (Last 3 days: June 7, June 8, June 9, 2026)
INSERT IGNORE INTO attendance (id, employee_id, date, total_work_hours, total_break_hours, status) VALUES
-- John Doe
(1, 1, '2026-06-07', 8.25, 0.75, 'present'),
(2, 1, '2026-06-08', 7.50, 1.00, 'present'),
(3, 1, '2026-06-09', 8.00, 0.50, 'present'),
-- Jane Smith
(4, 2, '2026-06-07', 8.50, 0.50, 'present'),
(5, 2, '2026-06-08', 0.00, 0.00, 'on_leave'),
(6, 2, '2026-06-09', 8.10, 0.60, 'present'),
-- Bob Wilson
(7, 3, '2026-06-07', 7.80, 0.70, 'present'),
(8, 3, '2026-06-08', 8.00, 0.50, 'present'),
(9, 3, '2026-06-09', 7.90, 0.80, 'present'),
-- Nitheeswaran
(10, 4, '2026-06-07', 8.10, 0.60, 'present'),
(11, 4, '2026-06-08', 7.75, 0.75, 'present'),
(12, 4, '2026-06-09', 8.20, 0.50, 'present');

-- 4. Insert Work Hours (check-in/check-out log details)
INSERT IGNORE INTO work_hours (attendance_id, check_in, check_out, hours) VALUES
-- John Doe
(1, '2026-06-07 09:00:00', '2026-06-07 18:00:00', 8.25),
(2, '2026-06-08 09:15:00', '2026-06-08 17:45:00', 7.50),
(3, '2026-06-09 09:00:00', '2026-06-09 17:30:00', 8.00),
-- Jane Smith
(4, '2026-06-07 08:45:00', '2026-06-07 17:45:00', 8.50),
(6, '2026-06-09 08:50:00', '2026-06-09 17:36:00', 8.10),
-- Bob Wilson
(7, '2026-06-07 09:30:00', '2026-06-07 18:00:00', 7.80),
(8, '2026-06-08 09:00:00', '2026-06-08 17:30:00', 8.00),
(9, '2026-06-09 09:05:00', '2026-06-09 17:47:00', 7.90),
-- Nitheeswaran
(10, '2026-06-07 09:10:00', '2026-06-07 18:05:00', 8.10),
(11, '2026-06-08 09:20:00', '2026-06-08 17:35:00', 7.75),
(12, '2026-06-09 09:00:00', '2026-06-09 17:40:00', 8.20);

-- 5. Insert Break Times
INSERT IGNORE INTO break_times (attendance_id, break_start, break_end, hours) VALUES
-- John Doe breaks
(1, '2026-06-07 13:00:00', '2026-06-07 13:45:00', 0.75),
(2, '2026-06-08 12:30:00', '2026-06-08 13:30:00', 1.00),
(3, '2026-06-09 13:00:00', '2026-06-09 13:30:00', 0.50),
-- Jane Smith breaks
(4, '2026-06-07 12:45:00', '2026-06-07 13:15:00', 0.50),
(6, '2026-06-09 13:10:00', '2026-06-09 13:46:00', 0.60),
-- Bob Wilson breaks
(7, '2026-06-07 13:00:00', '2026-06-07 13:42:00', 0.70),
(8, '2026-06-08 12:45:00', '2026-06-08 13:15:00', 0.50),
(9, '2026-06-09 13:00:00', '2026-06-09 13:48:00', 0.80),
-- Nitheeswaran breaks
(10, '2026-06-07 13:05:00', '2026-06-07 13:40:00', 0.58),
(11, '2026-06-08 12:35:00', '2026-06-08 13:20:00', 0.75),
(12, '2026-06-09 13:10:00', '2026-06-09 13:40:00', 0.50);

-- 6. Insert Leave Requests (1 pending, 1 approved, 1 rejected)
INSERT IGNORE INTO leave_requests (id, employee_id, leave_type, start_date, end_date, reason, status, approved_by) VALUES
(1, 2, 'casual', '2026-06-08', '2026-06-08', 'Family medical appointment', 'approved', 2),
(2, 1, 'sick', '2026-06-15', '2026-06-16', 'Dental surgery procedure', 'pending', NULL),
(3, 3, 'earned', '2026-06-01', '2026-06-03', 'Extended weekend vacation', 'rejected', 2),
(4, 4, 'casual', '2026-06-17', '2026-06-18', 'Personal travel planning', 'pending', NULL);

-- 7. Insert Salaries History (Paid records for May 2026)
INSERT IGNORE INTO salaries (employee_id, basic_salary, allowances, deductions, net_salary, payment_date, status) VALUES
(1, 6250.00, 500.00, 300.00, 6450.00, '2026-05-31', 'paid'),
(2, 5666.67, 400.00, 250.00, 5816.67, '2026-05-31', 'paid'),
(3, 4583.33, 300.00, 200.00, 4683.33, '2026-05-31', 'paid'),
(4, 6000.00, 450.00, 150.00, 6300.00, '2026-05-31', 'paid');
