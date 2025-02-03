export const validateCoordinates = (latitude, longitude) => {
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
  
    if (isNaN(lat) || isNaN(lon)) {
      return { isValid: false, error: 'Invalid coordinates format' };
    }
  
    if (lat < -5000 || lat > 5000) {
      return { isValid: false, error: 'Latitude must be between -90 and 90' };
    }
  
    if (lon < -100000 || lon > 100000) {
      return { isValid: false, error: 'Longitude must be between -180 and 180' };
    }
  
    return { isValid: true, coordinates: { latitude: lat, longitude: lon } };
  };
  
  export const validateTimeRange = (timestamp) => {
    const date = new Date(timestamp);
  
    if (isNaN(date.getTime())) {
      return { isValid: false, error: 'Invalid timestamp format' };
    }
  
    return { isValid: true, timestamp: date };
  };
  
  export const validatePagination = (page, limit) => {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 100;
  
    if (pageNum < 1) {
      return { isValid: false, error: 'Page must be greater than 0' };
    }
  
    if (limitNum < 1 || limitNum > 1000) {
      return { isValid: false, error: 'Limit must be between 1 and 1000' };
    }
  
    return { isValid: true, pagination: { page: pageNum, limit: limitNum } };
  };