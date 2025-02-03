import client from '../connection/redis.connect.js';

// Temporal decay configuration
const DECAY_CONFIG = {
    BASE_SCORE: 1.0,
    DECAY_FACTOR: 0.1,
    MAX_AGE_DAYS: 90,
    BOOST_FACTORS: {
        PREMIUM: 1.2,
        FEATURED: 1.1,
        VERIFIED: 1.05
    },
    TIME_WEIGHTS: {
        RECENT: { maxDays: 7, weight: 1.0 },
        MEDIUM: { maxDays: 30, weight: 0.8 },
        OLD: { maxDays: 90, weight: 0.6 }
    }
};

let cacheHits = 0;

// Calculate temporal score with advanced weighting
export const calculateTemporalScore = (dateAdded, propertyAttributes = {}) => {
    const currentDate = new Date();
    const propertyDate = new Date(dateAdded);
    const ageInDays = (currentDate - propertyDate) / (1000 * 60 * 60 * 24);

    // Base decay calculation using exponential decay
    let score = DECAY_CONFIG.BASE_SCORE *
        Math.exp(-DECAY_CONFIG.DECAY_FACTOR *
            Math.min(ageInDays, DECAY_CONFIG.MAX_AGE_DAYS));

    // Apply time-based weights
    if (ageInDays <= DECAY_CONFIG.TIME_WEIGHTS.RECENT.maxDays) {
        score *= DECAY_CONFIG.TIME_WEIGHTS.RECENT.weight;
    } else if (ageInDays <= DECAY_CONFIG.TIME_WEIGHTS.MEDIUM.maxDays) {
        score *= DECAY_CONFIG.TIME_WEIGHTS.MEDIUM.weight;
    } else {
        score *= DECAY_CONFIG.TIME_WEIGHTS.OLD.weight;
    }

    // Apply property-specific boosts
    if (propertyAttributes.isPremium) {
        score *= DECAY_CONFIG.BOOST_FACTORS.PREMIUM;
    }
    if (propertyAttributes.isFeatured) {
        score *= DECAY_CONFIG.BOOST_FACTORS.FEATURED;
    }
    if (propertyAttributes.isVerified) {
        score *= DECAY_CONFIG.BOOST_FACTORS.VERIFIED;
    }

    return score;
};

// Calculate dynamic TTL based on temporal score
export const calculateDynamicTTL = (score, baseTime = 3600) => {
    const minTTL = baseTime * 0.5;  // Minimum TTL (half of base time)
    const maxTTL = baseTime * 2;    // Maximum TTL (double of base time)
    return Math.floor(minTTL + (maxTTL - minTTL) * score);
};

// Sort properties by temporal relevance
export const sortByTemporalScore = (properties) => {
    return [...properties].sort((a, b) => {
        const scoreA = calculateTemporalScore(a.date_added, {
            isPremium: a.isPremium,
            isFeatured: a.isFeatured,
            isVerified: a.isVerified
        });
        const scoreB = calculateTemporalScore(b.date_added, {
            isPremium: b.isPremium,
            isFeatured: b.isFeatured,
            isVerified: b.isVerified
        });
        return scoreB - scoreA;
    });
};

// Cache management with temporal awareness
export const setCacheWithTemporalDecay = async (key, value, dateAdded, propertyAttributes = {}) => {
    try {
        const score = calculateTemporalScore(dateAdded, propertyAttributes);
        const ttl = calculateDynamicTTL(score);

        await client.setEx(key, ttl, JSON.stringify({
            data: value,
            score,
            timestamp: Date.now(),
            metadata: {
                dateAdded,
                ...propertyAttributes
            }
        }));

        // Store temporal score in sorted set for ranking
        await client.zAdd('temporal_scores', {
            score,
            value: key
        });

        return true;
    } catch (error) {
        console.error('Error in setCacheWithTemporalDecay:', error);
        return false;
    }
};

// Get cache with temporal validation
export const getCacheWithTemporalCheck = async (key) => {
    try {
        const value = await client.get(key);
        if (!value) return null;
        cacheHits++;
        const parsed = JSON.parse(value);
        const currentScore = calculateTemporalScore(
            parsed.metadata.dateAdded,
            parsed.metadata
        );

        // Check if cache needs refresh based on score degradation
        if (currentScore < parsed.score * 0.7) { // 30% degradation threshold
            await client.del(key);
            await client.zRem('temporal_scores', key);
            return null;
        }

        return parsed.data;
    } catch (error) {
        console.error('Error in getCacheWithTemporalCheck:', error);
        return null;
    }
};

// Cleanup old cached data based on temporal scores
export const cleanupTemporalCache = async (threshold = 0.3) => {
    try {
        // Get all keys with scores below threshold
        const lowScoreKeys = await client.zRangeByScore('temporal_scores', 0, threshold);

        if (lowScoreKeys.length > 0) {
            // Remove from cache and score tracking
            await Promise.all([
                ...lowScoreKeys.map(key => client.del(key)),
                client.zRemRangeByScore('temporal_scores', 0, threshold)
            ]);
        }

        return lowScoreKeys.length;
    } catch (error) {
        console.error('Error in cleanupTemporalCache:', error);
        return 0;
    }
};

// Update temporal scores periodically
export const updateTemporalScores = async () => {
    try {
        const keys = await client.zRange('temporal_scores', 0, -1);

        for (const key of keys) {
            const value = await client.get(key);
            if (!value) {
                await client.zRem('temporal_scores', key);
                continue;
            }

            const parsed = JSON.parse(value);
            const newScore = calculateTemporalScore(
                parsed.metadata.dateAdded,
                parsed.metadata
            );

            await client.zAdd('temporal_scores', {
                score: newScore,
                value: key
            });
        }
    } catch (error) {
        console.error('Error in updateTemporalScores:', error);
    }
};

// Get top ranked properties by temporal score
export const getTopRankedProperties = async (limit = 10) => {
    try {
        const topKeys = await client.zRevRangeByScore(
            'temporal_scores',
            '+inf',
            '-inf',
            {
                LIMIT: {
                    offset: 0,
                    count: limit
                }
            }
        );

        const properties = await Promise.all(
            topKeys.map(async key => {
                const value = await client.get(key);
                return value ? JSON.parse(value).data : null;
            })
        );

        return properties.filter(Boolean);
    } catch (error) {
        console.error('Error in getTopRankedProperties:', error);
        return [];
    }
};

// Calculate property relevance score
export const calculateRelevanceScore = (
    property,
    searchParams = {},
    userPreferences = {}
) => {
    let relevanceScore = calculateTemporalScore(property.date_added, {
        isPremium: property.isPremium,
        isFeatured: property.isFeatured,
        isVerified: property.isVerified
    });

    // Location relevance
    if (searchParams.latitude && searchParams.longitude) {
        const distance = calculateDistance(
            searchParams.latitude,
            searchParams.longitude,
            property.latitude,
            property.longitude
        );
        relevanceScore *= Math.exp(-distance / 10); // Decay with distance
    }

    // Price relevance
    if (searchParams.maxPrice) {
        const priceFactor = Math.min(searchParams.maxPrice / property.price, 1);
        relevanceScore *= priceFactor;
    }

    // User preferences boost
    if (userPreferences.preferredLocations?.includes(property.location)) {
        relevanceScore *= 1.2;
    }
    if (userPreferences.preferredTypes?.includes(property.property_type)) {
        relevanceScore *= 1.1;
    }

    return relevanceScore;
};

// Helper function to calculate distance between two points
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const toRad = (value) => {
    return value * Math.PI / 180;
};

// Export cache hits for monitoring
export const getCacheHits = () => cacheHits;