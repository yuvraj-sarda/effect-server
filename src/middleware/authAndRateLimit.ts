import express from 'express';
import { Effect } from 'effect';
import {
  redisClient,
  getRateLimit,
  processRequestWindow
} from '../services/redis';
import {
  logRequest,
  validateAuthHeader,
  cleanEndpoint
} from '../utils/helpers';

export const RATE_LIMIT_WINDOW = 60; // seconds

export const authAndRateLimit: express.RequestHandler = (req, res, next) => {
  const requestDate = new Date();
  logRequest(req, requestDate);

  // -------------------- auth ---------------------------------------------
  const token = validateAuthHeader(req.headers.authorization);
  if (!token) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const cleanedEndpoint = cleanEndpoint(req.url);

  // -------------------- effect program -----------------------------------
  const program = Effect.gen(function* () {
    const rateLimit = yield* getRateLimit(cleanedEndpoint, token);

    if (!rateLimit) {
      // fail fast so error is caught below and correct status is returned
      return yield* Effect.fail("PERMISSION_DENIED" as const);
    }

    const requestKey = `user-request-${cleanedEndpoint}-${token}`;

    // Track this request
    yield* Effect.tryPromise({
      try: () =>
        redisClient.send("LPUSH", [requestKey, requestDate.toISOString()]),
      catch: (error) => error as Error
    });

    const windowStartDate = new Date(
      requestDate.getTime() - RATE_LIMIT_WINDOW * 1000
    );

    const recentRequestCount = yield* processRequestWindow(
      requestKey,
      windowStartDate,
      true
    );

    return { rateLimit, recentRequestCount } as const;
  });

  // -------------------- execute program ----------------------------------
  Effect.runPromise(program)
    .then(({ rateLimit, recentRequestCount }) => {
      if (recentRequestCount > rateLimit) {
        res.status(429).json({ error: "Too many requests" });
        return;
      }

      next();
    })
    .catch((error) => {
      if (error === "PERMISSION_DENIED") {
        res.status(401).json({
          error: "This token does not have permission to access this API route"
        });
        return;
      }

      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    });
}; 