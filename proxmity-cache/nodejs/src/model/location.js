import mongoose from 'mongoose';

const { Schema } = mongoose;

const locationSchema = new Schema({
  locationId: { type: Number, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  altitude: { type: Number },
  timestamp: { type: Date, required: true },
  trafficCount: { type: Number, required: true },
  lastAccessed: { type: Date, default: Date.now },
  queryCount: { type: Number, default: 0 },
  userId: { type: String }
}, {
  timestamps: true,
  index: {
    locationId: 1,
    userId: 1
  }
});

// Create compound indexes for efficient querying
locationSchema.index({ latitude: 1, longitude: 1 }, { type: '2dsphere' });
locationSchema.index({ timestamp: 1 });
locationSchema.index({ userId: 1, timestamp: 1 });

// Add index for temporal queries
locationSchema.index({ lastAccessed: 1, queryCount: -1 });

const Location = mongoose.model('Location', locationSchema);

export default Location;
