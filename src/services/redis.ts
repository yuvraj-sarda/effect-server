import { Effect } from "effect";
import { RedisClient } from "bun";
import { cleanEndpoint } from "../utils/helpers";

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
 * Calculates the amount of requests that fall into the given window.
 * Optionally performs cleanup of the stored timestamps to keep Redis tidy.
 */
export const processRequestWindow = (
  requestKey: string,
  windowStartDate: Date,
  shouldCleanup: boolean = false
) =>
  Effect.gen(function* () {
    const allRequests: string[] = yield* Effect.tryPromise({
      try: () =>
        redisClient.send("LRANGE", [requestKey, "0", "-1"]) as Promise<string[]>,
      catch: (error) => error as Error
    });

    const cutoffIndex = allRequests.findIndex(
      (timestamp: string) => new Date(timestamp) >= windowStartDate
    );

    if (shouldCleanup) {
      if (cutoffIndex === -1) {
        yield* Effect.tryPromise({
          try: () => redisClient.del(requestKey),
          catch: (error) => error as Error
        });
      } else if (cutoffIndex > 0) {
        yield* Effect.tryPromise({
          try: () =>
            redisClient.send("LTRIM", [
              requestKey,
              cutoffIndex.toString(),
              "-1"
            ]),
          catch: (error) => error as Error
        });
      }
    }

    return cutoffIndex === -1 ? 0 : allRequests.length - cutoffIndex;
  });