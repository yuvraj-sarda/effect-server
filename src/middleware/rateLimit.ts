import express from 'express';
import { redisClient, getRateLimit, cleanupOldRequests, getRecentRequestCount } from '../services/redis';
import { cleanEndpoint } from '../utils/helpers';

export const RATE_LIMIT_WINDOW = 60;

export const rateLimitMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> => {
  const requestDate = new Date();
  const token = req.headers.authorization?.split(' ')[1]!;
  
  const cleanedEndpoint = cleanEndpoint(req.url);
  const rateLimit = await getRateLimit(cleanedEndpoint, token);
  if (!rateLimit) {
    res.status(401).json({ error: 'This token does not have permission to access this API route' });
    return;
  }

  const requestKey = `user-request-${cleanedEndpoint}-${token}`;
  await redisClient.sadd(requestKey, requestDate.toISOString());

  const windowStartDate = new Date(requestDate.getTime() - (RATE_LIMIT_WINDOW * 1000));
  await cleanupOldRequests(requestKey, windowStartDate);
  const recentRequestCount = await getRecentRequestCount(requestKey, windowStartDate);

  if (recentRequestCount > rateLimit) {
    res.status(429).json({ error: "Too many requests" });
    // TODO: add retry header
    return;
  }

  next();
}; 