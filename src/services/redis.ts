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

export const setRateLimits = async (endpoint: string, token: string, limit: string): Promise<void> => {
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
  const allRequests = await redisClient.smembers(requestKey);
  for (const timestamp of allRequests) {
    const requestDate = new Date(timestamp);
    if (requestDate < windowStartDate) {
      await redisClient.srem(requestKey, timestamp);
    }
  }
};

export const getRecentRequestCount = async (
  requestKey: string,
  windowStartDate: Date
): Promise<number> => {
  const allRequests = await redisClient.smembers(requestKey);
  return allRequests.filter(timestamp => new Date(timestamp) >= windowStartDate).length;
};