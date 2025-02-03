export class ProximityCache {
    constructor(config = {
      maxDistance: 1000, // in meters
      maxResults: 100
    }) {
      this.config = config;
    }
  
    createGeoQuery(latitude, longitude) {
      return {
        location: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [longitude, latitude]
            },
            $maxDistance: this.config.maxDistance
          }
        }
      };
    }
  
    generateCacheKey(latitude, longitude) {
      const precision = 4; 
      return `loc:${latitude.toFixed(precision)}:${longitude.toFixed(precision)}`;
    }
  }
  
  