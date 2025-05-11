import { RedisClient } from 'bun';
import { cleanEndpoint } from '../utils/helpers';

// Initialize Redis client
export const redisClient = new RedisClient(process.env.REDIS_URL!);

// Handle Redis connection events
redisClient.onconnect = () => {
  console.log('Connected to Redis server');
};

redisClient.onclose = (error) => {
  console.error('Disconnected from Redis server:', error);
};

export const setRateLimit = async (endpoint: string, token: string, limit: string): Promise<void> => {
    const cleanUrl = cleanEndpoint(endpoint);
    await redisClient.set(`user-limit-${cleanUrl}-${token}`, limit);
}; 

export const getRateLimit = async (endpoint: string, token: string): Promise<number | null> => {
  const cleanUrl = cleanEndpoint(endpoint);
  const rateLimitString = await redisClient.get(`user-limit-${cleanUrl}-${token}`);
  if (!rateLimitString) {
    return null;
  }
  return parseInt(rateLimitString);
};

export const processRequestWindow = async (
  requestKey: string,
  windowStartDate: Date,
  shouldCleanup: boolean = false
): Promise<number> => {
  // Get all requests in a single operation
  const allRequests = await redisClient.send("LRANGE", [requestKey, "0", "-1"]) as string[];
  const cutoffIndex = allRequests.findIndex((timestamp: string) => new Date(timestamp) >= windowStartDate);
  
  // If cleanup is requested, handle the cleanup operation
  if (shouldCleanup) {
    if (cutoffIndex === -1) {
      // If no requests are within window, clear the entire list
      await redisClient.del(requestKey);
    } else if (cutoffIndex > 0) {
      // Keep only requests from cutoffIndex onwards
      await redisClient.send("LTRIM", [requestKey, cutoffIndex.toString(), "-1"]);
    }
  }

  // Return the count of requests within the window
  return cutoffIndex === -1 ? 0 : allRequests.length - cutoffIndex;
};