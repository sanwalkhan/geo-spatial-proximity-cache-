import Redis from 'ioredis';
import mongoose from 'mongoose';
import Location from '../model/geoLife.js';

class MultiLevelCache {
  constructor() {
    this.redis = new Redis();
    this.defaultTTL = 3600; // 1 hour in seconds
  }

  /**
   * Get data from cache or database
   * @param {string} key - Cache key
   * @param {Function} dbFallback - Database query function
   * @param {number} [ttl] - Cache TTL in seconds
   */
  async get(key, dbFallback, ttl = this.defaultTTL) {
    try {
      // Level 1: Try Redis first
      console.log('Attempting to fetch from Redis:', key);
      const cachedData = await this.redis.get(key);
      
      if (cachedData) {
        console.log('Cache hit - Redis:', key);
        return JSON.parse(cachedData);
      }

      // Level 2: If not in Redis, execute DB query
      console.log('Cache miss - Fetching from MongoDB:', key);
      const data = await dbFallback();

      // Store in Redis for future requests
      if (data) {
        await this.redis.set(key, JSON.stringify(data), 'EX', ttl);
        console.log('Stored in Redis cache:', key);
      }

      return data;
    } catch (error) {
      console.error('Cache error:', error);
      // On cache error, fallback to database
      return dbFallback();
    }
  }

  /**
   * Invalidate cache entry
   * @param {string} key - Cache key
   */
  async invalidate(key) {
    try {
      await this.redis.del(key);
      console.log('Cache invalidated:', key);
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  /**
   * Store data in cache
   * @param {string} key - Cache key
   * @param {*} data - Data to cache
   * @param {number} [ttl] - Cache TTL in seconds
   */
  async set(key, data, ttl = this.defaultTTL) {
    try {
      await this.redis.set(key, JSON.stringify(data), 'EX', ttl);
      console.log('Data stored in cache:', key);
    } catch (error) {
      console.error('Cache storage error:', error);
    }
  }
}

// Create cache service instance
const cacheService = new MultiLevelCache();

// Enhanced geo-cache service with multi-level caching
const geoCacheService = {
  async getPagedData(query, page, pageSize) {
    const cacheKey = `pagedData:${JSON.stringify(query)}:${page}:${pageSize}`;

    return cacheService.get(cacheKey, async () => {
      const skip = (page - 1) * pageSize;
      const data = await Location.find(query)
        .skip(skip)
        .limit(pageSize)
        .lean()
        .exec();

      const totalCount = await Location.countDocuments(query).exec();
      
      return {
        data,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        currentPage: page,
      };
    });
  },

  async findNearbyLocations(longitude, latitude, radius, userId, page, pageSize) {
    const cacheKey = `nearbyLocations:${longitude}:${latitude}:${radius}:${userId}:${page}:${pageSize}`;

    return cacheService.get(cacheKey, async () => {
      const skip = (page - 1) * pageSize;
      
      const data = await Location.aggregate([
        {
          $geoNear: {
            near: { type: 'Point', coordinates: [longitude, latitude] },
            distanceField: 'distance',
            maxDistance: radius * 1000,
            spherical: true,
          },
        },
        { $match: userId ? { userId } : {} },
        { $skip: skip },
        { $limit: pageSize },
      ]);

      const totalCount = await Location.countDocuments({
        ...(userId && { userId }),
        location: {
          $geoWithin: {
            $centerSphere: [[longitude, latitude], radius / 3963.2],
          },
        },
      });

      return {
        data,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        currentPage: page,
      };
    });
  },

  // Method to manually invalidate cache entries
  async invalidateCache(pattern) {
    const keys = await cacheService.redis.keys(pattern);
    if (keys.length > 0) {
      await Promise.all(keys.map(key => cacheService.invalidate(key)));
      console.log(`Invalidated ${keys.length} cache entries matching pattern:`, pattern);
    }
  },
};

export default geoCacheService;