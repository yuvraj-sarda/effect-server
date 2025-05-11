import 'dotenv/config';
import express from 'express';
import { Effect } from 'effect';
import { connectRedis, closeRedis, setRateLimit, redisClient } from "./services/redis";
import { authAndRateLimit } from './middleware/authAndRateLimit';

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
app.post('/api/simulate', authAndRateLimit, (req, res) => {
  setTimeout(() => {
    res.json({
      message: 'Request processed successfully',
      timestamp: new Date().toISOString(),
      requestBody: req.body
    });
  }, 1000); // 1 second delay
});

// Compose boot sequence using Effect
const startServer = Effect.gen(function* () {
  // Ensure Redis connection is established
  yield* connectRedis;

  // Seed a demo rate-limit so the example endpoint can be exercised right
  yield* setRateLimit("/api/simulate", "sample.bearer.token.123", "3");

  // Start listening
  yield* Effect.sync(() => {
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  });
}).pipe(
  Effect.tapError((error) =>
    Effect.sync(() => {
      console.error("Failed to start server:", error);
    })
  )
);

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Closing Redis connection...');
  redisClient.close();
  process.exit(0);
});

// Run the server
Effect.runPromise(startServer).catch(() => {
  // If startup fails we make sure Redis is closed and exit the process.
  Effect.runSync(closeRedis);
  process.exit(1);
});