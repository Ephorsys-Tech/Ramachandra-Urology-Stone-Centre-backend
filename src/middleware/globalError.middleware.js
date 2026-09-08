import logger from "../config/logger.js";

// Global error handling middleware
const globalErrorHandler = (err, req, res, next) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
  });
//  Determine the status code and message to send in the response
  const statusCode = err.statusCode || 500;
  const message = err.message || "Something went wrong. Please try again later.";

  return res.status(statusCode).json({
    success: false,
    message,
  });
};

export { globalErrorHandler };
