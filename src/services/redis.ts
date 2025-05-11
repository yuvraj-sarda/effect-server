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
 * Fetch stored request timestamps for a given key from Redis.
 *
 * The timestamps are returned in the order Redis stores them (most recent first).
 */
const fetchRequestTimestamps = (requestKey: string) =>
  Effect.tryPromise({
    try: () =>
      redisClient.send("LRANGE", [requestKey, "0", "-1"]) as Promise<
        string[]
      >,
    catch: (error) => error as Error
  });

/**
 * Pure function that inspects the provided list of timestamps (ordered newest
 * first) and determines how long a caller should wait (in milliseconds) until
 * it drops back under the rate-limit threshold.
 *
 * If the caller is already under the threshold the function returns 0.
 */
const computeRetryDelay = (
  timestamps: string[],
  requestDate: Date,
  rateLimit: number
): number => {
  // If we're already under the limit, we don't need to wait.
  if (timestamps.length <= rateLimit) return 0;

  // Identify the start of the sliding window we care about.
  const windowStartDate = new Date(
    requestDate.getTime() - RATE_LIMIT_WINDOW * 1000
  );

  // Find the first request that lies *outside* the window. Everything before
  // that index is still considered "recent".
  const index = timestamps.findIndex(
    (ts) => new Date(ts) < windowStartDate
  );

  // index === -1 means that every stored request still lies inside the window.
  const numRequestsInWindow = index === -1 ? timestamps.length : index;

  if (numRequestsInWindow <= rateLimit) return 0;

  // Too many recent requests – calculate when the rate-limit will free up.
  const nextAvailableTime =
    new Date(timestamps[rateLimit - 1]).getTime() +
    RATE_LIMIT_WINDOW * 1000;

  return nextAvailableTime - requestDate.getTime();
};

/**
 * Calculate how long one must wait before one's requests will be less than the rate limit threshold and thus processed.
 */
export const calculateRetryAfter = (
		requestKey: string,
		requestDate: Date,
		rateLimit: number
	) =>
  Effect.gen(function* () {
    const timestamps: string[] = yield* fetchRequestTimestamps(requestKey);
    // TODO: We need not fetch all requests – fetching just (rateLimit + 1)
    // would suffice. Redis by default doesn't support an easy slice for the
    // *front* of a list, so we fetch everything for now.

    return computeRetryDelay(timestamps, requestDate, rateLimit);
  });

// TODO: it might make more sense to store meiliseconds in db, instead of date strings. Saves the time needed to convert.