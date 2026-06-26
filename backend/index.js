const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

// Import database pool to trigger test connection
const db = require('./config/db');

// Import custom middleware
const { errorHandler } = require('./middleware/errorMiddleware');

// Import route files
const authRoutes = require('./routes/authRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const salaryRoutes = require('./routes/salaryRoutes');

const app = express();

// Enable Cross-Origin Resource Sharing (CORS) for frontend interaction
app.use(cors());

// Parse incoming JSON request bodies
app.use(express.json());

// Log incoming HTTP requests in dev format
app.use(morgan('dev'));

// Define REST API routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/salaries', salaryRoutes);

// Base route for API healthcheck
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'Welcome to the Employee Management System REST API.',
    status: 'Running' 
  });
});

// Centralized error handling middleware (must be after all routes)
app.use(errorHandler);

// Listen on configured port
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server successfully started on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`👉 API Healthcheck endpoint: http://localhost:${PORT}/`);
});
