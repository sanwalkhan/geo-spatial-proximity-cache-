import redisService from '../services/redis.service.js';

export const cacheMiddleware = (ttl = 3600) => {
  return async (req, res, next) => {
    const cacheKey = `api:${req.originalUrl}`;

    try {
      const cachedData = await redisService.get(cacheKey);
      if (cachedData) {
        return res.status(200).json(cachedData);
      }

      // Store original send function
      const originalSend = res.send;

      // Override send function to cache response
      res.send = function (body) {
        try {
          const data = JSON.parse(body);
          redisService.set(cacheKey, data, ttl);
        } catch (error) {
          console.error('Cache middleware error:', error);
        }
        
        return originalSend.call(this, body);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

