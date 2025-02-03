import client from '../connection/redis.connect.js';
import Geohash from 'ngeohash';

// Geohash precision levels for different radiuses
const GEOHASH_PRECISION = {
    SMALL: 7,  // ~150m precision
    MEDIUM: 6, // ~1.2km precision
    LARGE: 5   // ~2.4km precision
};

// Cache organization using geohash
export const organizeCache = {
    // Get geohash precision based on search radius
    getPrecision(radius) {
        if (radius <= 1) return GEOHASH_PRECISION.SMALL;
        if (radius <= 5) return GEOHASH_PRECISION.MEDIUM;
        return GEOHASH_PRECISION.LARGE;
    },

    // Generate cache key using geohash
    async generateKey(lat, lng, radius) {
        const precision = this.getPrecision(radius);
        const geohash = Geohash.encode(lat, lng, precision);
        return `geo:${geohash}:${radius}`;
    },

    // Get neighboring cells for cache warming
    async getNeighbors(lat, lng, radius) {
        const precision = this.getPrecision(radius);
        const neighbors = Geohash.neighbors(Geohash.encode(lat, lng, precision));
        return neighbors;
    }
};

// Radius-based cache invalidation
export const radiusCache = {
    // Invalidate cache in radius
    async invalidateRadius(lat, lng, radius) {
        const precision = organizeCache.getPrecision(radius);
        const geohash = Geohash.encode(lat, lng, precision);
        const neighbors = Geohash.neighbors(geohash);
        
        // Include center and neighbors
        const cellsToInvalidate = [geohash, ...neighbors];
        
        for (const cell of cellsToInvalidate) {
            const pattern = `geo:${cell}:*`;
            const keys = await client.keys(pattern);
            if (keys.length > 0) {
                await client.del(keys);
            }
        }
    },

    // Check if point falls within cached radius
    isPointInRadius(centerLat, centerLng, pointLat, pointLng, radius) {
        const R = 6371; // Earth's radius in km
        const dLat = (pointLat - centerLat) * Math.PI / 180;
        const dLon = (pointLng - centerLng) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(centerLat * Math.PI / 180) * Math.cos(pointLat * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const d = R * c;
        return d <= radius;
    }
};

// Cache hit ratio optimization
export const cacheOptimizer = {
    hitCounter: new Map(),
    missCounter: new Map(),

    async trackHit(geohash) {
        this.hitCounter.set(geohash, (this.hitCounter.get(geohash) || 0) + 1);
        await this.optimizeIfNeeded(geohash);
    },

    async trackMiss(geohash) {
        this.missCounter.set(geohash, (this.missCounter.get(geohash) || 0) + 1);
        await this.optimizeIfNeeded(geohash);
    },

    async optimizeIfNeeded(geohash) {
        const hits = this.hitCounter.get(geohash) || 0;
        const misses = this.missCounter.get(geohash) || 0;
        const total = hits + misses;

        if (total >= 100) { // Analyze every 100 requests
            const hitRatio = hits / total;
            
            if (hitRatio < 0.5) { // If hit ratio is low, adjust cache strategy
                await this.adjustCacheStrategy(geohash, hitRatio);
            }

            // Reset counters
            this.hitCounter.set(geohash, 0);
            this.missCounter.set(geohash, 0);
        }
    },

    async adjustCacheStrategy(geohash, hitRatio) {
        if (hitRatio < 0.3) {
            // Reduce cache TTL for this region
            await client.expire(`geo:${geohash}:*`, 1800); // 30 minutes
        }
    }
};