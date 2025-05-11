import { Effect } from "effect";
import { RedisClient } from "bun";
import { cleanEndpoint } from "../utils/helpers";

export const RATE_LIMIT_WINDOW = 60; // seconds

/**
 * Raw Redis client instance. Consumers should prefer the Effect based helpers
 * exported by this module instead of calling the client directly.
 */
export const redisClient = new RedisClient(process.env.REDIS_URL!);

// --- connection logging ----------------------------------------------------
redisClient.onconnect = () => {
  console.log("Connected to Redis server");
};
redisClient.onclose = (error) => {
  console.error("Disconnected from Redis server:", error);
};

// --- lifecycle helpers -----------------------------------------------------

/**
 * Establishes a connection to Redis.
 */
export const connectRedis = Effect.tryPromise({
  try: () => redisClient.connect(),
  catch: (error) => error as Error
});

/**
 * Closes the Redis connection.
 */
export const closeRedis = Effect.sync(() => redisClient.close());

// --- business helpers ------------------------------------------------------

/**
 * Persist the rate-limit for the given token / endpoint combination.
 */
export const setRateLimit = (
  endpoint: string,
  token: string,
  limit: string
) =>
  Effect.tryPromise({
    try: () =>
      redisClient.set(`user-limit-${cleanEndpoint(endpoint)}-${token}`, limit),
    catch: (error) => error as Error
  });

/**
 * Retrieve the rate-limit for the given token / endpoint combination.
 */
export const getRateLimit = (endpoint: string, token: string) =>
  Effect.tryPromise({
    try: () =>
      redisClient.get(`user-limit-${cleanEndpoint(endpoint)}-${token}`),
    catch: (error) => error as Error
  }).pipe(
    Effect.map((rateLimitString) =>
      rateLimitString ? parseInt(rateLimitString) : null
    )
  );

/**
 * Calculate how long one must wait before one's requests will be less than the rate limit threshold and thus processed.
 */
export const calculateRetryAfter = (
		requestKey: string,
		requestDate: Date,
		rateLimit: number
	) => Effect.gen(function* () {
		const allRequests: string[] = yield* Effect.tryPromise({
			try: () =>
				redisClient.send("LRANGE", [requestKey, "0", "-1"]) as Promise<string[]>,
			catch: (error) => error as Error
		});
		// TODO: we need not fetch all the requests; only the first (rateLimit + 1) are needed. Haven't implemented right now because I'm not sure how to limit it on redis.
		// NOTE: this array is ordered with most recent timestamps first (Redis inserts at front not back)

		// if we are under the rate limit, early return since one need not wait.
		if (allRequests.length <= rateLimit) return 0;

		// else, calculate exactly which requests were recent
		const windowStartDate = new Date(
		  requestDate.getTime() - RATE_LIMIT_WINDOW * 1000
		);

		const index = allRequests.findIndex(
			(requestTimestamp: string) => new Date(requestTimestamp) < windowStartDate
		);
		// -1  ⇒  every request is still in the window
		const numRequestsInWindow = index === -1 ? allRequests.length : index;

		if (numRequestsInWindow <= rateLimit) return 0;

		// too many recent requests, so user must wait
		const nextAvailableTime = new Date(allRequests[rateLimit - 1]).getTime() + RATE_LIMIT_WINDOW * 1000
		const retryAfter = nextAvailableTime - requestDate.getTime()
		return retryAfter
	});

	// TODO: it might make more sense to store meiliseconds in db, instead of date strings. Saves the time needed to convert.