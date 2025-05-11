The rate limiter should be robust, efficient, and able to enforce multiple levels of limits.
If you have time, you can also add IP-based rate limiting.
--> very easy.

* We should have some way to see what’s going on in the system. You can choose how to do this, such as logging rate limit hits and violations, or exposing a simple metrics endpoint (e.g. /rate-limit-stats) to track current request counts per client.
---> You can monitor all the requests in redis + see console logs + see the log every time there's a rate limit exceeded.

* Provide a simple frontend or terminal UI to send requests and view rate limit enforcement in real time.
* Display response codes and headers in a user-friendly way.
--> Postman suffices.

1. Bonus:

    * Introduce rate limit tiers: if a given rate limit is hit, escalate to a more restrictive tier