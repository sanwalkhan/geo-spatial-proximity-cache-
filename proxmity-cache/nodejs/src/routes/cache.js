import express from 'express';
import cacheService from '../services/geo-cache.services.js';

const router = express.Router();

// Get all cached data
router.get('/cached-data', async (req, res) => {
  try {
    // Optional query parameters for filtering
    const { type, pattern } = req.query;
    
    const results = await cacheService.getAllCachedData();

    // Apply filters if provided
    if (type || pattern) {
      const filteredData = {};
      
      for (const [key, value] of Object.entries(results.data)) {
        // Filter by type
        if (type && value.type !== type) continue;
        
        // Filter by key pattern
        if (pattern && !key.includes(pattern)) continue;
        
        filteredData[key] = value;
      }
      
      results.data = filteredData;
      results.metadata.totalKeys = Object.keys(filteredData).length;
    }

    res.status(200).json(results);
  } catch (error) {
    console.error('Error fetching cached data:', error);
    res.status(500).json({ 
      error: 'An error occurred while fetching cached data',
      message: error.message 
    });
  }
});

// Get cache statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await cacheService.getCacheStats();
    res.status(200).json(stats);
  } catch (error) {
    console.error('Error fetching cache stats:', error);
    res.status(500).json({ 
      error: 'An error occurred while fetching cache statistics',
      message: error.message 
    });
  }
});

// Clear specific cache entries
router.delete('/clear', async (req, res) => {
  try {
    const { pattern } = req.body;
    
    if (!pattern) {
      return res.status(400).json({ 
        error: 'Pattern is required for cache clearing' 
      });
    }

    await cacheService.invalidateCache(pattern);
    res.status(200).json({ 
      message: `Cache entries matching pattern "${pattern}" have been cleared` 
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ 
      error: 'An error occurred while clearing cache',
      message: error.message 
    });
  }
});

export default router;