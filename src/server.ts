import 'dotenv/config';
import express from 'express';
import { Effect } from 'effect';
import { RedisClient } from 'bun';

const app = express();
const port = process.env.PORT || 3000;
console.assert(process.env.REDIS_URL, 'REDIS_URL environment variable is required but not set in the .env');

// Initialize Redis client
const redisClient = new RedisClient(process.env.REDIS_URL);

// Handle Redis connection events
redisClient.onconnect = () => {
  console.log('Connected to Redis server');
};

redisClient.onclose = (error) => {
  console.error('Disconnected from Redis server:', error);
};

// Hardcoded bearer token for demonstration
const VALID_BEARER_TOKEN = 'sample.bearer.token.123';
const RATE_LIMIT_WINDOW = 60;

// Middleware to parse JSON bodies
app.use(express.json());

// Authentication middleware
const authenticate = async (req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> => {
	console.log('Received request:', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    headers: req.headers,
    body: req.body,
    timestamp: new Date().toISOString()
  });

  const requestTimestamp = new Date().toISOString();
	const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];
	const rateLimitString: string | null = await redisClient.get(`user-limit-${req.url}-${token}`)
	console.log(`user-limit-${req.url}-${token}`)

  if (!rateLimitString) {
    res.status(401).json({ error: 'This token does not have permission to access this API route' });
    return;
  } 
	const rateLimit = parseInt(rateLimitString)

  const requestKey = `user-request-${req.url}-${token}`;
	await redisClient.sadd(requestKey, requestTimestamp);

	const allRequests = await redisClient.smembers(requestKey)
	let recentRequestCount = 0;
	const requestDate = new Date(requestTimestamp);
	const windowStartDate = new Date(requestDate.getTime() - (RATE_LIMIT_WINDOW * 1000)); // Convert seconds to milliseconds

	allRequests.forEach((prevTimestamp) => {
		const prevDate = new Date(prevTimestamp);
		if (prevDate < windowStartDate) {
			redisClient.srem(requestKey, prevTimestamp)
		} else {
			recentRequestCount += 1
		}
	})

	if (recentRequestCount >= rateLimit) {
		res.status(429).json({ error: "Too many requests" }) 
		return;
		// TODO: add a retry header
	}

  next();
};

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Simulated API endpoint with authentication
app.post('/api/simulate', authenticate, (req, res) => {
  setTimeout(() => {
    res.json({
      message: 'Request processed successfully',
      timestamp: new Date().toISOString(),
      requestBody: req.body
    });
  }, 1000); // 1 second delay
});

const setRateLimits = async (): Promise<void> => {
	const endpoint = "/api/simulate";
		await redisClient.set(`user-limit-${endpoint}-${VALID_BEARER_TOKEN}`, "3")
}

// Start the server using Effect
const startServer = Effect.try({
  try: async () => {
    // Ensure Redis connection is established
    await redisClient.connect();
		await setRateLimits();
    
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