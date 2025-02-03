import Redis from 'ioredis';
import mongoose from 'mongoose';
import Location from '../model/geoLife.js';

class MultiLevelCache {
  constructor() {
    this.redis = new Redis();
    this.defaultTTL = 3600; // 1 hour in seconds
    this.prefix = 'cache:';
  }

  /**
   * Get data from cache or database
   * @param {string} key - Cache key
   * @param {Function} dbFallback - Database query function
   * @param {number} [ttl] - Cache TTL in seconds
   */
  async get(key, dbFallback, ttl = this.defaultTTL) {
    const cacheKey = this.prefix + key;
    try {
      // Level 1: Try Redis first
      console.log('Attempting to fetch from Redis:', cacheKey);
      const cachedData = await this.redis.get(cacheKey);
      
      if (cachedData) {
        console.log('Cache hit - Redis:', cacheKey);
        return JSON.parse(cachedData);
      }

      // Level 2: If not in Redis, execute DB query
      console.log('Cache miss - Fetching from MongoDB:', cacheKey);
      const data = await dbFallback();

      // Store in Redis for future requests
      if (data) {
        await this.redis.set(cacheKey, JSON.stringify(data), 'EX', ttl);
        console.log('Stored in Redis cache:', cacheKey);
      }

      return data;
    } catch (error) {
      console.error('Cache error:', error);
      // On cache error, fallback to database
      return dbFallback();
    }
  }

  /**
   * Store data in cache
   * @param {string} key - Cache key
   * @param {*} data - Data to cache
   * @param {number} [ttl] - Cache TTL in seconds
   */
  async set(key, data, ttl = this.defaultTTL) {
    const cacheKey = this.prefix + key;
    try {
      await this.redis.set(cacheKey, JSON.stringify(data), 'EX', ttl);
      console.log('Data stored in cache:', cacheKey);
    } catch (error) {
      console.error('Cache storage error:', error);
      throw new Error('Failed to store data in cache');
    }
  }

  /**
   * Invalidate cache entry
   * @param {string} pattern - Cache key pattern to invalidate
   */
  async invalidate(pattern) {
    const fullPattern = this.prefix + pattern;
    try {
      const keys = await this.redis.keys(fullPattern);
      if (keys.length > 0) {
        await Promise.all(keys.map(key => this.redis.del(key)));
        console.log(`Invalidated ${keys.length} cache entries matching pattern:`, fullPattern);
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
      throw new Error('Failed to invalidate cache');
    }
  }

  /**
   * Get all cached data with metadata
   * @returns {Promise<Object>} Cached data with metadata
   */
  async getAllCachedData() {
    try {
      let cursor = '0';
      const results = {
        metadata: {
          totalKeys: 0,
          typeDistribution: {},
          scanTime: Date.now(),
          prefix: this.prefix
        },
        data: {}
      };

      do {
        const [newCursor, keys] = await this.redis.scan(
          cursor,
          'MATCH',
          this.prefix + '*',
          'COUNT',
          100
        );
        cursor = newCursor;

        for (const key of keys) {
          results.metadata.totalKeys++;
          
          const type = await this.redis.type(key);
          const ttl = await this.redis.ttl(key);
          
          results.metadata.typeDistribution[type] = 
            (results.metadata.typeDistribution[type] || 0) + 1;

          let value;
          switch(type) {
            case 'string':
              value = await this.redis.get(key);
              try {
                value = JSON.parse(value);
              } catch (e) {
                // Keep as string if not JSON
              }
              break;
            case 'hash':
              value = await this.redis.hgetall(key);
              break;
            case 'list':
              value = await this.redis.lrange(key, 0, -1);
              break;
            case 'set':
              value = await this.redis.smembers(key);
              break;
            case 'zset':
              value = await this.redis.zrange(key, 0, -1, 'WITHSCORES');
              break;
            default:
              value = 'Unsupported type';
          }

          results.data[key] = {
            type,
            ttl: ttl === -1 ? 'No expiration' : `${ttl} seconds`,
            value,
            createdAt: Date.now()
          };
        }
      } while (cursor !== '0');

      results.metadata.scanDuration = Date.now() - results.metadata.scanTime;
      return results;

    } catch (error) {
      console.error('Error fetching all cached data:', error);
      throw new Error('Failed to fetch cached data');
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} Cache statistics
   */
  async getCacheStats() {
    try {
      const info = await this.redis.info();
      const stats = {};
      
      info.split('\r\n').forEach(line => {
        const [key, value] = line.split(':');
        if (key && value) {
          stats[key] = value;
        }
      });

      return {
        usedMemory: stats.used_memory_human,
        connectedClients: stats.connected_clients,
        uptime: stats.uptime_in_seconds,
        totalConnections: stats.total_connections_received,
        totalCommands: stats.total_commands_processed,
        lastSave: stats.last_save_time,
        hitRate: stats.keyspace_hits ? 
          (parseInt(stats.keyspace_hits) / (parseInt(stats.keyspace_hits) + parseInt(stats.keyspace_misses)) * 100).toFixed(2) + '%' 
          : '0%'
      };
    } catch (error) {
      console.error('Error fetching cache stats:', error);
      throw new Error('Failed to fetch cache statistics');
    }
  }

  /**
   * Clear all cache entries with the service prefix
   */
  async clearAll() {
    try {
      const keys = await this.redis.keys(this.prefix + '*');
      if (keys.length > 0) {
        await Promise.all(keys.map(key => this.redis.del(key)));
        console.log(`Cleared all ${keys.length} cache entries`);
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw new Error('Failed to clear cache');
    }
  }

  /**
   * Get the size of cached data
   * @param {string} key - Cache key
   * @returns {Promise<number>} Size in bytes
   */
  async getSize(key) {
    const cacheKey = this.prefix + key;
    try {
      const data = await this.redis.get(cacheKey);
      return data ? Buffer.byteLength(data, 'utf8') : 0;
    } catch (error) {
      console.error('Error getting cache size:', error);
      return 0;
    }
  }
}

// Create cache service instances
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
        pageSize,
        query
      };
    });
  },

  async findNearbyLocations(longitude, latitude, radius, userId, page, pageSize) {
    const cacheKey = `nearbyLocations:${longitude}:${latitude}:${radius}:${userId}:${page}:${pageSize}`;

    return cacheService.get(cacheKey, async () => {
      const skip = (page - 1) * pageSize;
      
      const aggregation = [
        {
          $geoNear: {
            near: { type: 'Point', coordinates: [longitude, latitude] },
            distanceField: 'distance',
            maxDistance: radius * 1000, // Convert radius to meters
            spherical: true,
          },
        }
      ];

      // Add userId filter if provided
      if (userId) {
        aggregation.push({ $match: { userId } });
      }

      // Add pagination
      aggregation.push({ $skip: skip }, { $limit: pageSize });

      const data = await Location.aggregate(aggregation);

      // Count total documents
      const matchQuery = {
        location: {
          $geoWithin: {
            $centerSphere: [[longitude, latitude], radius / 3963.2], // Radius in radians
          },
        },
        ...(userId && { userId })
      };

      const totalCount = await Location.countDocuments(matchQuery);

      return {
        data,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        currentPage: page,
        pageSize,
        query: { longitude, latitude, radius, userId }
      };
    });
  },

  // Method to manually invalidate cache entries
  async invalidateCache(pattern) {
    return cacheService.invalidate(pattern);
  },

  // Get all cached data
  async getAllCachedData() {
    return cacheService.getAllCachedData();
  },

  // Get cache statistics
  async getCacheStats() {
    return cacheService.getCacheStats();
  },

  // Clear all cache
  async clearAllCache() {
    return cacheService.clearAll();
  }
};

export default geoCacheService;