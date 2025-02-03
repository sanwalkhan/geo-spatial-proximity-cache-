import mongoose from "mongoose"

const gpsTrajectorySchema = new mongoose.Schema({
  latitude: {
    type: Number,
    required: true,
    min: -5000,
    max: 5000,
  },
  longitude: {
    type: Number,
    required: true,
    min: -100000,
    max: 100000,
  },
  altitude: {
    type: Number,
    required: true,
  },
  timestamp: {
    type: Date,
    required: true,
  },
  user_id: {
    type: String,
    required: true,
  },
})

// Add a 2dsphere index on the latitude and longitude fields
gpsTrajectorySchema.index({ latitude: 1, longitude: 1 }, { type: "2dsphere" })

const GpsTrajectory = mongoose.model("gps_trajectories", gpsTrajectorySchema)

export default GpsTrajectory

