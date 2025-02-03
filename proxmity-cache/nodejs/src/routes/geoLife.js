import express from 'express';
import cacheService from '../services/geo-cache.services.js';

const router = express.Router();

// Get paginated trajectories with optimization
router.get('/gps-trajectories', async (req, res) => {
  try {
    const { page = 1, latitude, longitude, radius, limit = 100 } = req.query;
    
    // Ensure page and limit are integers
    const pageNumber = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);

    let result;
    if (latitude && longitude) {
      result = await cacheService.findNearbyLocations(
        parseFloat(longitude),
        parseFloat(latitude),
        parseFloat(radius) || 1,
        pageNumber,
        pageSize
      );
    } else {
      result = await cacheService.getPagedData({}, pageNumber, pageSize);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching GPS trajectories:', error);
    res.status(500).json({ error: 'An error occurred while fetching data.' });
  }
});

// Search users with pagination and optimization
router.get('/search-users', async (req, res) => {
  try {
    const { user_id, page = 1, latitude, longitude, radius, limit = 100 } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required for searching.' });
    }

    // Ensure page and limit are integers
    const pageNumber = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);

    let result;
    if (latitude && longitude) {
      result = await cacheService.findNearbyLocations(
        parseFloat(longitude),
        parseFloat(latitude),
        parseFloat(radius) || 1,
        user_id,
        pageNumber,
        pageSize
      );
    } else {
      result = await cacheService.getPagedData({ userId: user_id }, pageNumber, pageSize);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching user trajectories:', error);
    res.status(500).json({ error: 'An error occurred while searching user data.' });
  }
});

export default router;
