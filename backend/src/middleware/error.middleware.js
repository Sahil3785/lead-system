const logger = require('../services/logger.service');

/**
 * Centralized error middleware.
 * Handles async route errors and sends consistent JSON responses.
 */
function errorMiddleware(err, req, res, next) {
  logger.error('Request error', {
    path: req.path,
    method: req.method,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  const status = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

/**
 * Wraps async route handlers so thrown errors are passed to error middleware.
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { errorMiddleware, asyncHandler };
