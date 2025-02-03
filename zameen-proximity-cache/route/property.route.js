import express from "express"
import client from "../connection/redis.connect.js"
import PropertyModel from "../model/property.model.js"
import { getCacheHits } from "../services/decay.service.js"
import {
  addProperty,
  coordinateRangeIndexing,
  findNearbyProperties,
  getPropertyById,
} from "../services/property.services.js"
import { clearAllCache, getCacheHitCount, getTotalCachedDocuments, getTotalDataCached } from "../services/redis.services.js"

const router = express.Router()

/**
 * @swagger
 * components:
 *   schemas:
 *     Property:
 *       type: object
 *       required:
 *         - place
 *         - latitude
 *         - longitude
 *       properties:
 *         place:
 *           type: string
 *         latitude:
 *           type: number
 *         longitude:
 *           type: number
 *         date_added:
 *           type: string
 *           format: date
 *         location:
 *           type: object
 *           properties:
 *             type:
 *               type: string
 *               enum: [Point]
 *             coordinates:
 *               type: array
 *               items:
 *                 type: number
 *               minItems: 2
 *               maxItems: 2
 */

/**
 * @swagger
 * /api/v1/properties:
 *   get:
 *     summary: Get all properties with pagination
 *     tags: [Properties]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *     responses:
 *       200:
 *         description: List of properties
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 properties:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Property'
 *                 totalPages:
 *                   type: integer
 *                 currentPage:
 *                   type: integer
 */
router.get("/", async (req, res) => {
  const page = Number.parseInt(req.query.page) || 1
  const limit = 100

  try {
    const properties = await PropertyModel.find()
      .skip((page - 1) * limit)
      .limit(limit)

    const total = await PropertyModel.countDocuments()
    const totalPages = Math.ceil(total / limit)

    res.json({
      properties,
      totalPages,
      currentPage: page,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @swagger
 * /api/v1/properties/coordinate-range-indexing:
 *   get:
 *     summary: Get properties within a coordinate range
 *     tags: [Properties]
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *         description: Latitude
 *       - in: query
 *         name: lng
 *         required: true
 *         schema:
 *           type: number
 *         description: Longitude
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *         description: Search radius
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of properties within the coordinate range
 *       400:
 *         description: Bad request
 */
router.get("/coordinate-range-indexing", async (req, res) => {
  try {
    const { lat, lng, radius, page = 1, limit = 50 } = req.query

    if (!lat || !lng) {
      return res.status(400).json({ error: "Latitude and longitude are required" })
    }

    const pagination = {
      page: Number.parseInt(page, 10),
      limit: Number.parseInt(limit, 10),
    }

    const { properties, totalCount, totalPages } = await coordinateRangeIndexing(
      Number.parseFloat(lat),
      Number.parseFloat(lng),
      Number.parseFloat(radius),
      pagination,
    )

    res.json({
      properties,
      totalCount,
      totalPages,
      currentPage: pagination.page,
    })
  } catch (error) {
    console.error("Error in GET /coordinate-range-indexing:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

/**
 * @swagger
 * /api/v1/properties/nearby:
 *   get:
 *     summary: Get nearby properties
 *     tags: [Properties]
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *         description: Latitude
 *       - in: query
 *         name: lng
 *         required: true
 *         schema:
 *           type: number
 *         description: Longitude
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *         description: Search radius
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of nearby properties
 *       400:
 *         description: Bad request
 */
router.get("/nearby", async (req, res) => {
  try {
    const { lat, lng, radius, page = 1, limit = 50 } = req.query

    if (!lat || !lng) {
      return res.status(400).json({ error: "Latitude and longitude are required" })
    }

    const pagination = {
      page: Number.parseInt(page, 10),
      limit: Number.parseInt(limit, 10),
    }

    const { properties, totalCount, totalPages } = await findNearbyProperties(
      Number.parseFloat(lat),
      Number.parseFloat(lng),
      Number.parseFloat(radius),
      pagination,
    )

    const hasMore = pagination.page < totalPages // Calculate if there are more pages

    res.json({
      properties,
      totalCount,
      totalPages,
      currentPage: pagination.page,
      hasMore, // Add the new flag
    })
  } catch (error) {
    console.error("Error in GET /nearby:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

/**
 * @swagger
 * /api/v1/properties:
 *   post:
 *     summary: Add a new property
 *     tags: [Properties]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Property'
 *     responses:
 *       201:
 *         description: Created property
 *       500:
 *         description: Internal server error
 */
router.post("/", async (req, res) => {
  try {
    const property = await addProperty(req.body)
    res.status(201).json(property)
  } catch (error) {
    console.error("Error in POST /:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

/**
 * @swagger
 * /api/v1/properties/get-property/{id}:
 *   get:
 *     summary: Get a property by ID
 *     tags: [Properties]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Property ID
 *     responses:
 *       200:
 *         description: Property details
 *       404:
 *         description: Property not found
 *       500:
 *         description: Internal server error
 */
router.get("/get-property/:id", async (req, res) => {
  try {
    const property = await getPropertyById(req.params.id)
    if (!property) {
      return res.status(404).json({ error: "Property not found" })
    }
    res.json(property)
  } catch (error) {
    console.error("Error in GET /:id:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

/**
 * @swagger
 * /api/v1/properties/migrate-structure:
 *   put:
 *     summary: Migrate property structure for 2dsphere indexing
 *     tags: [Properties]
 *     responses:
 *       200:
 *         description: Structure migrated successfully
 *       500:
 *         description: Internal server error
 */
router.put("/migrate-structure", async (req, res) => {
  try {
    // Step 1: Rename 'location' to 'place'
    await PropertyModel.updateMany({}, { $rename: { location: "place" } })

    // Step 2: Migrate data
    const properties = await PropertyModel.find({})
    const bulkOps = properties.map((property) => {
      // Ensure date_added exists and is a string
      let newDateAdded = null
      if (typeof property.date_added === "string" && property.date_added.includes("-")) {
        const [day, month, year] = property.date_added.split("-").map(Number)
        newDateAdded = new Date(year, month - 1, day) // Month is 0-based
      }

      return {
        updateOne: {
          filter: { _id: property._id },
          update: {
            $set: {
              location: {
                type: "Point",
                coordinates: [property.longitude, property.latitude],
              },
              ...(newDateAdded && { date_added: newDateAdded }), // Update only if newDateAdded is valid
            },
          },
        },
      }
    })

    if (bulkOps.length > 0) {
      await PropertyModel.collection.bulkWrite(bulkOps)
    }

    // Step 3: Create a 2dsphere index on the new 'location' field
    await PropertyModel.collection.createIndex({ location: "2dsphere" })

    res.status(200).json({ message: "Structure and date_added migrated successfully!" })
  } catch (error) {
    console.error("Error migrating structure and date_added field:", error)
    res.status(500).json({ message: "Failed to migrate structure and date_added field", error })
  }
})

/**
 * @swagger
 * /api/v1/properties/cacheStats:
 *   get:
 *     summary: Get cache hit statistics
 *     tags: [Properties]
 *     responses:
 *       200:
 *         description: Cache hit count
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 cacheHits:
 *                   type: integer
 *                   description: Number of cache hits
 */
router.get("/cacheStats", async (req, res) => {
  try {
    const { totalKeys, totalDocuments } = await getTotalCachedDocuments(client);
    res.json({
      cacheHits: getCacheHitCount(),
      totalDataCached: getTotalDataCached(),
      totalKeys,
      totalDocuments,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch cache stats", error });
  }
});


/**
 * @swagger
 * /api/v1/properties/clear-cache:
 *   delete:
 *     summary: Clear Cache
 *     tags: [Properties]
 *     responses:
 *       200:
 *         description: Cache Clear Status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Cache Cleared Successfully
 */
router.delete("/clear-cache", async (req, res) => {
  clearAllCache(client)
  res.json({
    message: "Cache Cleared Successfully",
  })
})

/**
 * @swagger
 * /api/v1/properties/aggregate:
 *   get:
 *     summary: Aggregate property data by city
 *     description: Fetch aggregated property data grouped by city, including counts for sale and rent properties, and available property types. You can filter results by purpose and property type.
 *     tags: [Properties]
 *     parameters:
 *       - in: query
 *         name: purpose
 *         schema:
 *           type: string
 *           enum: [For Sale, For Rent]
 *         description: Filter results by property purpose
 *       - in: query
 *         name: propertyType
 *         schema:
 *           type: string
 *         description: Filter results by property type
 *     responses:
 *       200:
 *         description: Successfully fetched aggregated property data
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   city:
 *                     type: string
 *                     description: Name of the city
 *                   count:
 *                     type: integer
 *                     description: Total number of properties in the city
 *                   forSale:
 *                     type: integer
 *                     description: Total number of properties available for sale in the city
 *                   forRent:
 *                     type: integer
 *                     description: Total number of properties available for rent in the city
 *                   propertyTypes:
 *                     type: array
 *                     items:
 *                       type: string
 *                     description: List of unique property types available in the city
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Internal Server Error
 */
router.get("/aggregate", async (req, res) => {
  try {
    const { purpose, propertyType } = req.query

    // Build the aggregation pipeline
    const pipeline = [
      {
        $group: {
          _id: "$city",
          count: { $sum: 1 },
          forSale: {
            $sum: { $cond: [{ $eq: ["$purpose", "For Sale"] }, 1, 0] },
          },
          forRent: {
            $sum: { $cond: [{ $eq: ["$purpose", "For Rent"] }, 1, 0] },
          },
          propertyTypes: {
            $addToSet: "$property_type",
          },
        },
      },
      {
        $project: {
          city: "$_id",
          count: 1,
          forSale: 1,
          forRent: 1,
          propertyTypes: 1,
          _id: 0,
        },
      },
      { $sort: { count: -1 } },
    ]

    // Apply filters if provided
    if (purpose) {
      pipeline.unshift({
        $match: { purpose: purpose },
      })
    }

    if (propertyType) {
      pipeline.unshift({
        $match: { property_type: propertyType },
      })
    }

    const result = await PropertyModel.aggregate(pipeline)

    res.json(result)
  } catch (error) {
    console.error("Error in property aggregation:", error)
    res.status(500).json({ error: "Internal Server Error" })
  }
})

export default router

