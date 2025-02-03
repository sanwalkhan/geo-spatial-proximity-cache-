const fs = require('fs/promises');
const path = require('path');
const readline = require('readline');
const { createReadStream } = require('fs');
const Location = require('../models/location');

class GeolifeDataProcessor {
  constructor(batchSize = 1000) {
    this.batchSize = batchSize;
    this.processedCount = 0;
  }

  async processFile(filePath) {
    const fileStream = createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let batch = [];
    let lineCount = 0;

    for await (const line of rl) {
      lineCount++;
      // Skip the header lines (first 6 lines in Geolife format)
      if (lineCount <= 6) continue;

      const point = this.parseTrajectoryLine(line, this.processedCount + batch.length);
      if (point) {
        batch.push(point);

        if (batch.length >= this.batchSize) {
          await this.saveBatch(batch);
          batch = [];
        }
      }
    }

    // Save remaining points
    if (batch.length > 0) {
      await this.saveBatch(batch);
    }
  }

  parseTrajectoryLine(line, currentId) {
    try {
      const [latitude, longitude, _, altitude, days, date, time] = line.trim().split(',');

      // Convert date and time to timestamp
      const [year, month, day] = date.split('/');
      const [hour, minute, second] = time.split(':');
      const timestamp = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(minute),
        parseInt(second)
      );

      return {
        locationId: currentId,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        altitude: parseFloat(altitude),
        timestamp
      };
    } catch (error) {
      console.error(`Error parsing line: ${line}`);
      return null;
    }
  }

  async saveBatch(batch) {
    try {
      const locations = batch.map(point => ({
        locationId: point.locationId,
        latitude: point.latitude,
        longitude: point.longitude,
        timestamp: point.timestamp,
        altitude: point.altitude,
        trafficCount: Math.floor(Math.random() * 100), // Simulated traffic data
        lastAccessed: new Date(),
        queryCount: 0
      }));

      await Location.insertMany(locations, { ordered: false });
      this.processedCount += batch.length;
      console.log(`Processed ${this.processedCount} points`);
    } catch (error) {
      console.error('Error saving batch:', error);
    }
  }
}

module.exports = GeolifeDataProcessor;
