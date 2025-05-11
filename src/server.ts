import express from 'express';
import { Effect } from 'effect';

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Simulated API endpoint
app.post('/api/simulate', (req, res) => {
  console.log('Received request:', {
    method: req.method,
    url: req.url,
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