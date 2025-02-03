import mongoose from 'mongoose';

const propertySchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  id: {
    type: Number,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  host_id: {
    type: Number,
    required: true,
  },
  host_identity_verified: {
    type: String,
    enum: ["confirmed", "unconfirmed"],
    required: true,
  },
  host_name: {
    type: String,
    required: true,
  },
  neighbourhood_group: {
    type: String,
    required: true,
  },
  neighbourhood: {
    type: String,
    required: true,
  },
  location: { // GeoJSON object for 2d Sphere Index
    type: {
      type: String,
      enum: ["Point"], // Only "Point" is allowed for GeoJSON
      required: true,
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  },
  country: {
    type: String,
    required: true,
  },
  country_code: {
    type: String,
    required: true,
  },
  instant_bookable: {
    type: Boolean,
    required: true,
  },
  cancellation_policy: {
    type: String,
    required: true,
  },
  room_type: {
    type: String,
    required: true,
  },
  construction_year: {
    type: Number,
    required: true,
  },
  price: {
    type: String,
    required: true,
  },
  service_fee: {
    type: String,
    required: true,
  },
  minimum_nights: {
    type: Number,
    required: true,
  },
  number_of_reviews: {
    type: Number,
    required: true,
  },
  last_review: {
    type: String,
    required: true,
  },
  reviews_per_month: {
    type: Number,
    required: true,
  },
  review_rate_number: {
    type: Number,
    required: true,
  },
  calculated_host_listings_count: {
    type: Number,
    required: true,
  },
  availability_365: {
    type: Number,
    required: true,
  },
  house_rules: {
    type: String,
    required: true,
  },
});

// Create a 2d Sphere Index on the `location` field
propertySchema.index({ location: '2dsphere' });

const Property = mongoose.model('usa-datasets', propertySchema);

export default Property;