/**
 * Express catch-all error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  // Determine response status code (default to 500 Server Error if status is 200)
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  console.error(`[Error] ${req.method} ${req.url} :`, err.stack || err.message);

  res.status(statusCode).json({
    message: err.message || 'Internal Server Error',
    // Include full error details in development environments only
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
};

module.exports = { errorHandler };
