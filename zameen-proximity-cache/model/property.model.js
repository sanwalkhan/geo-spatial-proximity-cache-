import mongoose from 'mongoose';

// Define the schema
const propertySchema = new mongoose.Schema({
  property_id: {
    type: Number,
    required: true,
    unique: true
  },
  location_id: {
    type: Number,
    required: true
  },
  page_url: {
    type: String,
    required: true
  },
  property_type: {
    type: String,
    enum: ['Flat', 'House', 'Plot', 'Commercial'],
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  place: {
    type: String, // Updated: `place` replaces the old `location` string field
    required: true
  },
  city: {
    type: String,
    required: true
  },
  province_name: {
    type: String,
    required: true
  },
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  location: {
    type: {
      type: String, // GeoJSON type
      enum: ['Point'], // Only `Point` is allowed
      required: true
    },
    coordinates: {
      type: [Number], // Array of numbers: [longitude, latitude]
      required: true
    }
  },
  baths: {
    type: Number,
    required: true
  },
  area: {
    type: String,
    required: true
  },
  purpose: {
    type: String,
    enum: ['For Sale', 'For Rent'],
    required: true
  },
  bedrooms: {
    type: Number,
    required: true
  },
  date_added: {
    type: Date,
    required: true
  },
  area_type: {
    type: String,
    required: true
  },
  area_size: {
    type: Number,
    required: true
  },
  area_category: {
    type: String,
    required: true
  }
});

// Add a 2dsphere index on the `location` field
propertySchema.index({ location: '2dsphere' }, { background: true });

// Export the model
export default mongoose.model('zameen-prices', propertySchema);
