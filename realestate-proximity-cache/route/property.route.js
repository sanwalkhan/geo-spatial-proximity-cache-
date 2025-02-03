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
import mongoose from "mongoose"

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
 * /api/v1/properties/migrate-to-2dsphere:
 *   get:
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
 *     summary: Aggregate property data by neighbourhood
 *     description: Fetch aggregated property data grouped by neighbourhood, including counts, construction years, room types, cancellation policies, and host identity verification statuses. You can filter results by construction year, room type, cancellation policy, and host identity verification status.
 *     tags: [Properties]
 *     parameters:
 *       - in: query
 *         name: constructionYear
 *         schema:
 *           type: integer
 *         description: Filter results by construction year of the property
 *       - in: query
 *         name: roomType
 *         schema:
 *           type: string
 *         description: Filter results by room type of the property
 *       - in: query
 *         name: cancellationPolicy
 *         schema:
 *           type: string
 *         description: Filter results by cancellation policy of the property
 *       - in: query
 *         name: hostIdentityVerified
 *         schema:
 *           type: string
 *           enum: [verified, unverified]
 *         description: Filter results by host identity verification status
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
 *                   neighbourhood:
 *                     type: string
 *                     description: Name of the neighbourhood
 *                   count:
 *                     type: integer
 *                     description: Total number of properties in the neighbourhood
 *                   constructionYears:
 *                     type: array
 *                     items:
 *                       type: integer
 *                     description: List of unique construction years of properties in the neighbourhood
 *                   roomTypes:
 *                     type: array
 *                     items:
 *                       type: string
 *                     description: List of unique room types available in the neighbourhood
 *                   cancellationPolicies:
 *                     type: array
 *                     items:
 *                       type: string
 *                     description: List of unique cancellation policies in the neighbourhood
 *                   hostIdentityVerifiedStatuses:
 *                     type: array
 *                     items:
 *                       type: string
 *                     description: List of unique host identity verification statuses in the neighbourhood
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
    const { constructionYear, roomType, cancellationPolicy, hostIdentityVerified } = req.query;
    console.log(hostIdentityVerified, "hostIdentityVerified");
    

    // Build the aggregation pipeline
    const pipeline = [
      {
        $group: {
          _id: "$neighbourhood",
          count: { $sum: 1 },
          constructionYears: { $addToSet: "$construction_year" },
          roomTypes: { $addToSet: "$room_type" },
          cancellationPolicies: { $addToSet: "$cancellation_policy" },
          hostIdentityVerifiedStatuses: { $addToSet: "$host_identity_verified" },
        },
      },
      {
        $project: {
          neighbourhood: "$_id",
          count: 1,
          constructionYears: 1,
          roomTypes: 1,
          cancellationPolicies: 1,
          hostIdentityVerifiedStatuses: 1,
          _id: 0,
        },
      },
      { $sort: { count: -1 } },
    ];

    // Apply filters if provided
    if (constructionYear) {
      pipeline.unshift({
        $match: { construction_year: parseInt(constructionYear) },
      });
    }

    if (roomType) {
      pipeline.unshift({
        $match: { room_type: roomType },
      });
    }

    if (cancellationPolicy) {
      pipeline.unshift({
        $match: { cancellation_policy: cancellationPolicy },
      });
    }

    if (hostIdentityVerified) {
      pipeline.unshift({
        $match: { host_identity_verified: hostIdentityVerified },
      });
    }

    const result = await PropertyModel.aggregate(pipeline);

    res.json(result);
  } catch (error) {
    console.error("Error in property aggregation:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});



router.get("/migrate-to-2dsphere", async (req, res) => {
  try {
    const aggregationPipeline = [
      // Step 1: Convert lat/long to numbers
      {
        $set: {
          lat: { $convert: { input: "$lat", to: "double", onError: null, onNull: null } },
          long: { $convert: { input: "$long", to: "double", onError: null, onNull: null } },
        },
      },
      // Step 2: Ensure valid latitude & longitude
      {
        $match: {
          lat: { $gte: -90, $lte: 90, $ne: null },
          long: { $gte: -180, $lte: 180, $ne: null },
        },
      },
      // Step 3: Create GeoJSON field
      {
        $set: {
          location: { type: "Point", coordinates: ["$long", "$lat"] },
        },
      },
      // Step 4: Normalize field names & convert types
      {
        $set: {
          name: "$NAME",
          host_id: { $toString: "$host id" },
          host_identity_verified: "$host_identity_verified",
          host_name: "$host name",
          neighbourhood_group: "$neighbourhood group",
          neighbourhood: "$neighbourhood",
          country: "$country",
          country_code: "$country code",
          instant_bookable: { $toBool: "$instant_bookable" },
          cancellation_policy: "$cancellation_policy",
          room_type: "$room type",
          construction_year: { $convert: { input: "$Construction year", to: "int", onError: null, onNull: null } },
          price: {
            $toDouble: {
              $ifNull: [
                {
                  $getField: {
                    field: "match",
                    input: {
                      $regexFind: {
                        input: { $toString: "$price" },
                        regex: "[0-9.]+"
                      }
                    }
                  }
                },
                0,
              ],
            },
          },
          service_fee: {
            $toDouble: {
              $ifNull: [
                {
                  $getField: {
                    field: "match",
                    input: {
                      $regexFind: {
                        input: { $toString: "$service fee" },
                        regex: "[0-9.]+"
                      }
                    }
                  }
                },
                0,
              ],
            },
          },
          minimum_nights: { $convert: { input: "$minimum nights", to: "int", onError: 1, onNull: 1 } },
          number_of_reviews: { $convert: { input: "$number of reviews", to: "int", onError: 0, onNull: 0 } },
          last_review: {
            $dateFromString: { dateString: "$last review", onError: null },
          },
          reviews_per_month: { $convert: { input: "$reviews per month", to: "double", onError: 0, onNull: 0 } },
          review_rate_number: { $convert: { input: "$review rate number", to: "int", onError: null, onNull: null } },
          calculated_host_listings_count: { $convert: { input: "$calculated host listings count", to: "int", onError: 1, onNull: 1 } },
          availability_365: { $convert: { input: "$availability 365", to: "int", onError: 0, onNull: 0 } },
          house_rules: "$house_rules",
        },
      },
      // Step 5: Remove unnecessary fields
      {
        $unset: [
          "NAME",
          "host id",
          "host name",
          "neighbourhood group",
          "room type",
          "Construction year",
          "service fee",
          "minimum nights",
          "number of reviews",
          "last review",
          "reviews per month",
          "review rate number",
          "calculated host listings count",
          "availability 365",
          "lat",
          "long",
        ],
      },
      // Step 6: Overwrite the collection using $out
      {
        $out: "usa-datasets",
      },
    ];

    // Execute the aggregation pipeline
    await mongoose.connection.db.collection("usa-datasets").aggregate(aggregationPipeline).toArray();

    // Step 7: Recreate the 2dsphere index
    await mongoose.connection.db.collection("usa-datasets").createIndex({ location: "2dsphere" });

    // Get statistics
    const totalCount = await mongoose.connection.db.collection("usa-datasets").countDocuments();

    res.json({
      success: true,
      message: "Migration completed. Data has been fully replaced.",
      stats: {
        totalDocuments: totalCount,
      },
    });
  } catch (error) {
    console.error("Migration error:", error);
    res.status(500).json({
      success: false,
      message: "Data migration failed",
      error: error.message,
      details: "Check for documents with invalid coordinates (null/NaN)",
    });
  }
});






export default router

