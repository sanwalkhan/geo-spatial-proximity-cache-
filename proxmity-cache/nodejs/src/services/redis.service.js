import Redis from 'ioredis';
import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

class RedisService {
  constructor() {
    this.redis = new Redis({
      port: process.env.REDIS_PORT || 6379,
      host: process.env.REDIS_HOST || '127.0.0.1',
      retryStrategy: (times) => Math.min(times * 50, 2000)
    });

    this.redis.on('error', (error) => {
      console.error('Redis connection error:', error);
    });

    this.redis.on('connect', () => {
      console.log('Connected to Redis');
    });
  }

  async setCompressed(key, value, ttl = 3600) {
    try {
      const compressed = await gzip(Buffer.from(JSON.stringify(value)));
      await this.redis.setex(key, ttl, compressed);
      return true;
    } catch (error) {
      console.error('Redis SET Compressed Error:', error);
      return false;
    }
  }

  async getCompressed(key) {
    try {
      const compressed = await this.redis.getBuffer(key);
      if (!compressed) return null;
      const decompressed = await gunzip(compressed);
      return JSON.parse(decompressed.toString());
    } catch (error) {
      console.error('Redis GET Compressed Error:', error);
      return null;
    }
  }

  async geoAdd(key, longitude, latitude, member) {
    try {
      await this.redis.geoadd(key, longitude, latitude, member);
      return true;
    } catch (error) {
      console.error('Redis GEOADD Error:', error);
      return false;
    }
  }

  async geoRadius(key, longitude, latitude, radius, unit = 'km') {
    try {
      return await this.redis.georadius(key, longitude, latitude, radius, unit);
    } catch (error) {
      console.error('Redis GEORADIUS Error:', error);
      return [];
    }
  }
}

export default new RedisService();

