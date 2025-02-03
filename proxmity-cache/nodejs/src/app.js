import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import { connectDB } from "./config/database.js";
import cacheRoutes from './routes/cache.js';
import geoLife from "./routes/geoLife.js";
import geoSpatial from "./routes/geoSpatial.js";

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// Connect to databases
connectDB();


// Routes
app.use("/api", geoLife);
app.use('/api/cache', cacheRoutes);
app.use('/api/geo-spatial', geoSpatial);

// Fallback route
app.use((req, res) => {
  res.status(404).json({ error: "Route not found." });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "An unexpected error occurred." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;

