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

export const cleanupOldRequests = async (
  requestKey: string,
  windowStartDate: Date
): Promise<void> => {
  // Get all requests and find the index of the first request within our window
  const allRequests = await redisClient.send("LRANGE", [requestKey, "0", "-1"]) as string[];
  const cutoffIndex = allRequests.findIndex((timestamp: string) => new Date(timestamp) >= windowStartDate);
  
  if (cutoffIndex === -1) {
    // If no requests are within window, clear the entire list
    await redisClient.del(requestKey);
  } else if (cutoffIndex > 0) {
    // Keep only requests from cutoffIndex onwards
    await redisClient.send("LTRIM", [requestKey, cutoffIndex.toString(), "-1"]);
  }
};

export const getRecentRequestCount = async (
  requestKey: string,
  windowStartDate: Date
): Promise<number> => {
  const allRequests = await redisClient.send("LRANGE", [requestKey, "0", "-1"]) as string[];
  return allRequests.filter((timestamp: string) => new Date(timestamp) >= windowStartDate).length;
};