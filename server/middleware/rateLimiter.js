import rateLimit from 'express-rate-limit';
import { config } from '../config/config.js';

/**
 * Rate limiter for 6-digit access code lookup to prevent brute forcing
 */
export const codeLookupLimiter = rateLimit({
  windowMs: config.codeRateLimitWindowMinutes * 60 * 1000,
  max: config.codeRateLimitMaxAttempts,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many code attempts. For security, please wait a few minutes before trying again.'
  }
});

/**
 * Rate limiter for file uploads to prevent spam/abuse
 */
export const uploadLimiter = rateLimit({
  windowMs: config.uploadRateLimitWindowMinutes * 60 * 1000,
  max: config.uploadRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Upload limit reached. Please wait a few minutes before creating more shares.'
  }
});
