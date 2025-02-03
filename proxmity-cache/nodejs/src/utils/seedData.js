const Location = require('../models/location');
const mongoose = require('mongoose');

async function seedSampleData() {
  try {
    // Clear existing data
    await Location.deleteMany({});

    // Generate sample data
    const sampleData = Array.from({ length: 1000 }, (_, i) => ({
      locationId: i + 1,
      latitude: 40.7128 + (Math.random() - 0.5) * 0.1,
      longitude: -74.0060 + (Math.random() - 0.5) * 0.1,
      timestamp: new Date(),
      trafficCount: Math.floor(Math.random() * 200),
      lastAccessed: new Date(),
      queryCount: 0
    }));

    await Location.insertMany(sampleData);
    console.log('Sample data seeded successfully');
  } catch (error) {
    console.error('Error seeding data:', error);
  }
}

module.exports = seedSampleData;
