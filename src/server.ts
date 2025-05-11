import express from 'express';
import { Effect } from 'effect';

const app = express();
const port = process.env.PORT || 3000;

// Hardcoded bearer token for demonstration
const VALID_BEARER_TOKEN = 'sample-bearer-token-123';

// Middleware to parse JSON bodies
app.use(express.json());

// Authentication middleware
const authenticateBearerToken = (req: express.Request, res: express.Response, next: express.NextFunction): void => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];
  if (token !== VALID_BEARER_TOKEN) {
    res.status(401).json({ error: 'Invalid bearer token' });
    return;
  }

  next();
};

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Simulated API endpoint with authentication
app.post('/api/simulate', authenticateBearerToken, (req, res) => {
  console.log('Received request:', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    headers: req.headers,
    body: req.body,
    timestamp: new Date().toISOString()
  });
	
  // Simulate some processing time
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
  try: () => {
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  },
  catch: (error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
});

// Run the server
Effect.runPromise(startServer);