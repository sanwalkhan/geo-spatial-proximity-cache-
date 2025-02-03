import Property from '../model/property.model.js';
import client from '../connection/redis.connect.js';
import { organizeCache, radiusCache, cacheOptimizer } from './proximity-cache.service.js';
import {
    calculateTemporalScore,
    setCacheWithTemporalDecay,
    getCacheWithTemporalCheck
} from './decay.service.js';
import { generateLocationKey } from './redis.services.js';

export async function findNearbyProperties(latitude, longitude, radius = 5, { page = 1, limit = 50 }) {
    try {
        // Generate cache key using geohash
        const cacheKey = await organizeCache.generateKey(latitude, longitude, radius);

        // Try to get from cache with temporal validation
        const cachedResult = await getCacheWithTemporalCheck(cacheKey);
        if (cachedResult) {
            console.log('Cache hit!');
            await cacheOptimizer.trackHit(cacheKey);
            return cachedResult;
        }

        console.log('Cache miss, querying MongoDB...');
        await cacheOptimizer.trackMiss(cacheKey);

        const skip = (page - 1) * limit;

        // Get total count with geospatial query
        const totalCountResults = await Property.aggregate([
            {
                $geoNear: {
                    near: { type: 'Point', coordinates: [longitude, latitude] },
                    distanceField: 'distance',
                    maxDistance: radius * 1000,
                    spherical: true,
                    key: 'location',
                }
            },
            { $count: 'totalCount' }
        ]);

        const totalCount = totalCountResults.length > 0 ? totalCountResults[0].totalCount : 0;
        const totalPages = Math.ceil(totalCount / limit);

        // Get properties with temporal and proximity scoring
        let properties = await Property.aggregate([
            {
                $geoNear: {
                    near: { type: 'Point', coordinates: [longitude, latitude] },
                    distanceField: 'distance',
                    maxDistance: radius * 1000,
                    spherical: true,
                    key: 'location',
                }
            },
            { $skip: skip },
            { $limit: limit }
        ]);

        // Apply temporal decay and proximity scoring
        properties = properties.map(property => ({
            ...property,
            score: calculateTemporalScore(property.date_added) *
                (1 / (1 + property.distance / 1000)) // Distance factor
        }));

        // Sort by combined score
        properties.sort((a, b) => b.score - a.score);

        const result = {
            properties,
            totalCount,
            totalPages,
            currentPage: page,
            metadata: {
                queryTimestamp: new Date(),
                coordinates: { latitude, longitude },
                radius
            }
        };

        // Cache with temporal decay
        await setCacheWithTemporalDecay(cacheKey, result, new Date());

        // Warm cache for neighboring cells
        const neighbors = await organizeCache.getNeighbors(latitude, longitude, radius);
        for (const neighbor of neighbors) {
            const neighborKey = `geo:${neighbor}:${radius}`;
            const neighborProperties = await Property.aggregate([
                {
                    $geoNear: {
                        near: { type: 'Point', coordinates: [longitude, latitude] },
                        distanceField: 'distance',
                        maxDistance: radius * 1000,
                        spherical: true,
                        key: 'location',
                    }
                },
                { $limit: 10 } // Limited set for cache warming
            ]);

            if (neighborProperties.length > 0) {
                await setCacheWithTemporalDecay(neighborKey, {
                    properties: neighborProperties,
                    metadata: { queryTimestamp: new Date() }
                }, new Date());
            }
        }

        return result;
    } catch (error) {
        console.error('Error finding nearby properties:', error);
        throw error;
    }
}

// Add property with cache invalidation
export async function addProperty(propertyData) {
    try {
        const property = new Property({
            ...propertyData,
            location: {
                type: 'Point',
                coordinates: [propertyData.longitude, propertyData.latitude]
            }
        });

        await property.save();

        // Invalidate cache in the affected radius
        await radiusCache.invalidateRadius(
            propertyData.latitude,
            propertyData.longitude,
            10 // Invalidate cache in 10km radius
        );

        return property;
    } catch (error) {
        console.error('Error adding property:', error);
        throw error;
    }
}

// Get a property by its ID
export async function getPropertyById(id) {
    try {
        return await Property.findOne({ property_id: id });
    } catch (error) {
        console.error('Error fetching property by ID:', error);
        throw error;
    }
}


export async function coordinateRangeIndexing(latitude, longitude, radius = 5, { page, limit }) {
    try {
        // Check cache first
        const cacheKey = generateLocationKey(latitude, longitude, radius, page, limit);
        const cachedResult = await getCache(client, cacheKey);

        if (cachedResult) {
            console.log('Cache hit!');
            return cachedResult;
        }

        console.log('Cache miss, querying MongoDB...');

        // Query MongoDB for total count and paginated results
        const query = {
            latitude: {
                $gte: latitude - radius * 0.009,
                $lte: latitude + radius * 0.009,
            },
            longitude: {
                $gte: longitude - radius * 0.009,
                $lte: longitude + radius * 0.009,
            },
        };

        const totalCount = await Property.countDocuments(query);

        const properties = await Property.find(query)
            .skip((page - 1) * limit)
            .limit(limit);

        const totalPages = Math.ceil(totalCount / limit);

        // Cache the paginated results
        await setCacheWithExpiry(client, cacheKey, { properties, totalCount, totalPages });

        // Store in Redis Geo set for future radius queries
        for (const property of properties) {
            await geoAdd(client, 'properties_geo', property.longitude, property.latitude, property.property_id.toString());
        }

        return { properties, totalCount, totalPages };
    } catch (error) {
        console.error('Error finding nearby properties:', error);
        throw error;
    }
}