import redisCluster from '../services/redis-cluster.service.js';

async function testCompression() {
  // Create sample data
  const testData = {
    id: 1,
    name: "Test Data",
    description: "This is a long text that will benefit from compression".repeat(1000),
    coordinates: Array.from({ length: 1000 }, (_, i) => ({
      lat: Math.random() * 90,
      lng: Math.random() * 180,
      timestamp: Date.now() + i
    }))
  };

  try {
    console.log('Original data size:', Buffer.from(JSON.stringify(testData)).length, 'bytes');

    // Test compression
    console.log('Compressing and storing data...');
    const start = Date.now();
    await redisCluster.setCompressed('test-key', testData);
    console.log('Compression time:', Date.now() - start, 'ms');

    // Test retrieval and decompression
    console.log('Retrieving and decompressing data...');
    const retrieveStart = Date.now();
    const retrieved = await redisCluster.getCompressed('test-key');
    console.log('Retrieval time:', Date.now() - retrieveStart, 'ms');

    // Verify data integrity
    console.log('Data integrity check:', JSON.stringify(testData) === JSON.stringify(retrieved));
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testCompression();

