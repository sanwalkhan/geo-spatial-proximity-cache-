const { connectDB } = require('../config/database');
const { GeolifeDataProcessor } = require('../utils/dataProcessor');
const path = require('path');
const fs = require('fs/promises');

async function importGeolifeData(dataDir) {
  try {
    await connectDB();
    const processor = new GeolifeDataProcessor(1000);

    // Get all user directories
    const users = await fs.readdir(dataDir);
    
    for (const user of users) {
      const trajectoryPath = path.join(dataDir, user, 'Trajectory');
      
      try {
        const files = await fs.readdir(trajectoryPath);
        
        for (const file of files) {
          if (file.endsWith('.plt')) {
            console.log(`Processing file: ${file} for user ${user}`);
            await processor.processFile(path.join(trajectoryPath, file));
          }
        }
      } catch (error) {
        console.error(`Error processing user ${user}:`, error);
        continue;
      }
    }

    console.log('Data import completed');
    process.exit(0);
  } catch (error) {
    console.error('Error importing data:', error);
    process.exit(1);
  }
}

// Usage: NODE_ENV=development node src/scripts/importGeolifeData.js /path/to/Geolife/Data
const dataDir = process.argv[2];
if (!dataDir) {
  console.error('Please provide the path to Geolife dataset');
  process.exit(1);
}

importGeolifeData(dataDir);
