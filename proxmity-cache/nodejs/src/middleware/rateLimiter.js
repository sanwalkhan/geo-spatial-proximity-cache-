import { rateLimit } from 'express-rate-limit';

// Rate limiting middleware
export const rateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    status: 429,
    error: 'Too many requests. Please try again later.',
    nextValidRequestTime: '', 
  },
  standardHeaders: true,
  legacyHeaders: false,
});

