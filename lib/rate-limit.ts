/**
 * This is a bot/scraping guard, NOT a usage cap. Analysis itself is
 * unlimited by design (see PRD Section 4 / blueprint decision) because
 * local Ollama inference costs the app nothing per request. The threshold
 * below is deliberately generous — a real job seeker running many
 * legitimate analyses in one sitting should never hit it.
 *
 * Ships with a simple in-memory limiter, fine for a single-instance deploy.
 * Swap in Upstash Redis (env vars already in .env.example) once you scale
 * beyond one region/instance, since in-memory state doesn't share across
 * server instances.
 */

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 20; // generous — abuse guard, not a cap

const buckets = new Map<string, { count: number; windowStart: number }>();

export function checkRateLimit(identifier: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const bucket = buckets.get(identifier);

  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    buckets.set(identifier, { count: 1, windowStart: now });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1 };
  }

  if (bucket.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, remaining: 0 };
  }

  bucket.count += 1;
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - bucket.count };
}

/** Extracts a best-effort client identifier from standard proxy headers. */
export function getClientIdentifier(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
