# Effect Rate Limiter Server

A robust, efficient, and flexible rate limiter service built with Effect, Express, and Redis. This service acts as a middleware for REST APIs, controlling access based on request frequency for each client. Clients are identified using a secure bearer token, and rate limits are enforced per account.

## Features

- **Client Identification:**
  - Identifies clients based on a bearer token header (per-account rate limiting).
  - Secure handling of credentials.
- **Multiple Rate Limits:**
  - Flexible architecture to support different rate limiting strategies.
- **Persistence:**
  - Uses Redis for distributed, persistent rate limit tracking (suitable for serverless or multi-server environments).
- **Configuration:**
  - Supports different rate limits per user/account role (e.g., free vs. premium users).
  - Admin endpoint to override rate limits for specific users.
- **Response Handling:**
  - Returns HTTP 429 (Too Many Requests) when a client exceeds the rate limit.
  - Provides a `Retry-After` header to indicate when requests can be retried.
- **Observability & Logging:**
  - Logs every incoming request, including method, URL, IP, headers, and timestamp.
  - Logs rate limit hits and violations, including when a user exceeds their rate limit.
  - All logs are output to the console, making it easy to monitor system activity and debug issues in real time. This provides clear visibility into how the rate limiter is functioning and when limits are being enforced.
  - The logging implementation can be easily extended to write to files or external monitoring systems if needed.

## Getting Started

1. **Clone the repository:**
   ```sh
   git clone https://github.com/yuvraj-sarda/effect-server
   cd effect-server
   ```
2. **Install dependencies:**
   ```sh
   bun install
   ```
3. **Set up environment variables:**
   - Create a `.env` file based on the `.env.example` file. 
4. **Run the server:**
   ```sh
   bun run src/server.ts
   ```

## Usage

- Send POST requests to `/api/simulate` with a valid Bearer token in the `Authorization` header.
- Use the `/api/set-rate-limit` endpoint to override rate limits for specific users (see code for details).

## Notes
- This project was built as a demonstration of rate limiting techniques using Effect and Redis. It was also my first exposure to using Bun as the main runtime.
- Not actively maintained or intended for production use. Feel free to explore or adapt for your own learning or experimentation.

