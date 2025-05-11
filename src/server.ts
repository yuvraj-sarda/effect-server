import 'dotenv/config';
import express from 'express';
import { Effect } from 'effect';
import { redisClient, setRateLimits } from './services/redis';
import { authenticate, VALID_BEARER_TOKEN } from './middleware/auth';
import { rateLimitMiddleware } from './middleware/rateLimit';

const app = express();
const port = process.env.PORT || 3000;
console.assert(process.env.REDIS_URL, 'REDIS_URL environment variable is required but not set in the .env');

// Middleware to parse JSON bodies
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Simulated API endpoint with authentication and rate limiting
app.post('/api/simulate', authenticate, rateLimitMiddleware, (req, res) => {
  setTimeout(() => {
    res.json({
      message: 'Request processed successfully',
      timestamp: new Date().toISOString(),
      requestBody: req.body
    });
  }, 1000); // 1 second delay
});

// Start the server using Effect
const startServer = Effect.try({
  try: async () => {
    // Ensure Redis connection is established
    await redisClient.connect();
    await setRateLimits('/api/simulate', VALID_BEARER_TOKEN, '3');
    
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  },
  catch: (error) => {
    console.error('Failed to start server:', error);
    // Ensure Redis connection is closed on server failure
    redisClient.close();
    process.exit(1);
  }
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Closing Redis connection...');
  redisClient.close();
  process.exit(0);
});

// Run the server
Effect.runPromise(startServer);