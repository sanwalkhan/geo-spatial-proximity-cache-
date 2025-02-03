import redis from 'redis';

// Create a Redis client
const client = redis.createClient({
    host: 'localhost', 
    port: 6379 
});

// Handle connection events
client.on('connect', () => {
    console.log('Connected to Redis server');
});

client.on('error', (err) => {
    console.error('Redis connection error:', err);
});

// Export the client for use in other parts of your application
export default client;