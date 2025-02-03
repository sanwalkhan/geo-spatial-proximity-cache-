let cacheHits = 0;
let totalDataCached = 0; // Tracks the total data cached in bytes

// Sets a cache entry with an expiry time and updates total cached data size
export async function setCacheWithExpiry(client, key, value, expiry = 3600) {
  const dataString = JSON.stringify(value);
  totalDataCached += Buffer.byteLength(dataString, "utf8"); // Increment total cached data size
  await client.setEx(key, expiry, dataString);
}

// Retrieves a cache entry and tracks cache hits
export async function getCache(client, key) {
  const value = await client.get(key);
  if (value) {
    cacheHits++; // Increment cache hit counter
    console.log(`Cache hit for key: ${key} | Total Hits: ${cacheHits}`);
    return JSON.parse(value);
  } else {
    console.log(`Cache miss for key: ${key}`);
  }
  return null;
}

// Retrieves all cached data and calculates the total document count
export async function getTotalCachedDocuments(client) {
  try {
    const keys = await client.keys("*"); // Get all keys
    let totalDocuments = 0;

    for (const key of keys) {
      const keyType = await client.type(key); // Get the type of the key

      if (keyType === "string") {
        // Only process string-type keys
        const value = await client.get(key);
        if (value) {
          const parsedValue = JSON.parse(value);
          if (Array.isArray(parsedValue)) {
            totalDocuments += parsedValue.length; // Count array length as documents
          } else {
            totalDocuments++; // Count single object as one document
          }
        }
      } else {
        console.log(`Skipping key '${key}' of type '${keyType}'`);
      }
    }

    return {
      totalKeys: keys.length,
      totalDocuments,
    };
  } catch (error) {
    console.error("Error while retrieving cached data:", error);
    throw new Error("Failed to retrieve cached data");
  }
}


// Retrieves cache stats
export function getCacheHitCount() {
  return cacheHits;
}

// Retrieves total cached data size
export function getTotalDataCached() {
  return totalDataCached; // Return the total cached data size in bytes
}

// Clears all keys from the Redis cache and resets counters
export async function clearAllCache(client) {
  try {
    await client.sendCommand(["FLUSHALL"]); // Clear all keys
    totalDataCached = 0; // Reset the total data cached
    console.log("All cache cleared successfully.");
  } catch (error) {
    console.error("Error while clearing all cache:", error);
    throw new Error("Failed to clear all cache");
  }
}


export function generateLocationKey(latitude, longitude, radius) {
  return `location:${latitude}:${longitude}:${radius}`;
}