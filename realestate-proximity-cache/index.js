import express from "express";
import dotenv from 'dotenv';
import propertyRoutes from './route/property.route.js';
import connectDB from './connection/mongoDB.connect.js';
import client from './connection/redis.connect.js';
import swaggerUi from 'swagger-ui-express';
import swaggerJsDoc from 'swagger-jsdoc';

const app = express();

connectDB();
client.connect()
dotenv.config();
// Middleware for parsing JSON bodies
app.use(express.json());

// Basic route
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to the Slavery Dataset API' });
});

app.use('/api/v1/properties', propertyRoutes);

// Define port
const PORT = process.env.PORT || 3000;

// Swagger setup
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'GeoSpatial API',
            version: '1.0.0',
            description: 'Welcome to the GeoSpatial API documentation for the Property Marketplace Dataset. This API serves as a platform for managing property data with advanced geo-spatial features, including proximity-based searches, caching for optimized performance, and integrations with modern tools like MongoDB and Redis.This API is built to enable seamless interaction with a dataset of properties, offering robust functionality for managing and querying properties based on geolocation, and leveraging proximity caching for performance optimization.',
        },
        servers: [
            {
                url: 'http://localhost:3001',
            },
        ],
    },
    apis: ['./route/property.route.js'], 
};

  
  const swaggerDocs = swaggerJsDoc(swaggerOptions);
  app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerDocs));


// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});