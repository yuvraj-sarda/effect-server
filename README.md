## Project Requirements

### Objective

Your goal is to create a rate limiter using Effect. This service will sit on the edge of a REST API, controlling access based on request frequency for each client. Clients can be identified using a secure method, such as an API key, bearer token, or IP address. The rate limiter should be robust, efficient, and able to enforce multiple levels of limits.

### Requirements

Features

1. Client Identification:

    * Identify clients based on a bearer token header. This will authenticate their account, so the rate limiting will be per account. If you have time, you can also add IP-based rate limiting.
    * Ensure secure handling of credentials.

1. Multiple Rate Limits:

    * There are multiple strategies you can use for enforcing rate limit levels. Ideally your solution is flexible enough that you can swap in different strategies as needed. You may want to do some research on how rate limiters typically function. Start simple, and then you can increase the complexity if you have time.

1. Persistence:

    * Imagine that we are either in a serverless or multi-server environment, so the rate limit information cannot just be stored in memory. Use some sort of distributed data store to store the information (hint: Redis)

1. Configuration:

    * Allow different rate limits per user/account role (e.g., free users vs. premium users). 
    * Add an admin endpoint to enable overriding rate limits for a particular user

1. Response Handling:

    * Return 429 Too Many Requests when a client exceeds the rate limit.
    * Provide a Retry-After header to indicate when they can retry.

1. Observability:

    * We should have some way to see what’s going on in the system. You can choose how to do this, such as logging rate limit hits and violations, or exposing a simple metrics endpoint (e.g. /rate-limit-stats) to track current request counts per client.

1. Frontend/TUI Application:

    * Provide a simple frontend or terminal UI to send requests and view rate limit enforcement in real time.
    * Display response codes and headers in a user-friendly way.

1. Bonus:

    * Introduce rate limit tiers: if a given rate limit is hit, escalate to a more restrictive tier
    * Also allow setting different rate limits per endpoint.


You can use AI/any tools that you would like to solve this. Feel free to ask us any questions you have — we are here to collaborate with you. If you find yourself stuck at any point, please ask us. When you are finished, you will present a demo of what you have built and walk us through the code you’ve written.
