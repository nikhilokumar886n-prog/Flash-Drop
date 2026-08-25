import multer from 'multer';

export function errorHandler(err, req, res, next) {
  console.error(`[Error] ${req.method} ${req.url}:`, err.message);

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: 'One or more files exceed the maximum allowed upload size limit.'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Too many files uploaded at once.'
      });
    }
    return res.status(400).json({
      error: `File upload error: ${err.message}`
    });
  }

  const statusCode = err.status || err.statusCode || 500;
  const message = err.clientMessage || (statusCode === 500 ? 'An unexpected server error occurred. Please try again.' : err.message);

  res.status(statusCode).json({
    error: message
  });
}
