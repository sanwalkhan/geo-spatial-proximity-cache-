import express from "express"
import { rateLimiter } from "../middleware/rateLimiter.js"
import geoCacheService from "../services/geo-cache.services.js"
import { monitoringService } from "../utils/services.monitoring.js"
import { validateCoordinates, validatePagination, validateTimeRange } from "../utils/validation.js"

const router = express.Router()

// Apply rate limiting to all routes
router.use(rateLimiter)
router.use(monitoringService.requestDurationMiddleware)

// Get spatiotemporal data
router.get("/data", async (req, res) => {
  try {
    const { latitude, longitude, radius, timestamp, page, limit, user_id } = req.query

    // Validate coordinates
    const coordValidation = validateCoordinates(Number.parseFloat(latitude), Number.parseFloat(longitude))
    if (!coordValidation.isValid) {
      return res.status(400).json({ error: coordValidation.error })
    }

    // Validate timestamp
    const timeValidation = validateTimeRange(timestamp)
    if (!timeValidation.isValid) {
      return res.status(400).json({ error: timeValidation.error })
    }

    // Validate pagination
    const paginationValidation = validatePagination(page, limit)
    if (!paginationValidation.isValid) {
      return res.status(400).json({ error: paginationValidation.error })
    }

    const result = await geoCacheService.findNearbyLocations(
      Number.parseFloat(longitude),
      Number.parseFloat(latitude),
      Number.parseFloat(radius) || 1,
      user_id,
      paginationValidation.pagination.page,
      paginationValidation.pagination.limit,
    )

    res.status(200).json(result)
  } catch (error) {
    monitoringService.recordError("data_fetch")
    console.error("Error fetching data:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Warmup cache
router.post("/cache/warmup", async (req, res) => {
  try {
    const { region, timeRange } = req.body

    if (!region || !timeRange) {
      return res.status(400).json({ error: "Region and timeRange are required" })
    }

    // Implementation of cache warmup logic
    // This would typically involve pre-fetching data for the specified region and time range
    const result = await geoCacheService.getPagedData(
      {
        latitude: { $gte: region.minLat, $lte: region.maxLat },
        longitude: { $gte: region.minLon, $lte: region.maxLon },
        timestamp: { $gte: new Date(timeRange.start), $lte: new Date(timeRange.end) },
      },
      1,
      1000,
    )

    res.status(200).json({ message: "Cache warmup completed", result })
  } catch (error) {
    monitoringService.recordError("cache_warmup")
    console.error("Error warming up cache:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Get cache statistics
router.get("/cache/stats", async (req, res) => {
  try {
    const stats = await geoCacheService.getCacheStats()
    res.status(200).json(stats)
  } catch (error) {
    monitoringService.recordError("cache_stats")
    console.error("Error fetching cache stats:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Clear cache (admin only)
router.post("/cache/clear", async (req, res) => {
  try {
    const { pattern } = req.body
    await geoCacheService.invalidateCache(pattern)
    res.status(200).json({ message: "Cache cleared successfully" })
  } catch (error) {
    monitoringService.recordError("cache_clear")
    console.error("Error clearing cache:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Monitoring endpoint (admin only)
router.get("/metrics", async (req, res) => {
  try {
    const metrics = await monitoringService.getMetrics()
    res.set("Content-Type", monitoringService.getContentType())
    res.status(200).send(metrics)
  } catch (error) {
    monitoringService.recordError("metrics")
    console.error("Error fetching metrics:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

export default router

