/**
 * In-memory rate limiter for API routes.
 * Note: On Vercel serverless, each cold-start gets a fresh Map.
 * This still provides meaningful protection against rapid brute-force
 * within a single instance lifetime, and is much better than nothing.
 */

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Check if an IP has exceeded the rate limit.
 * Returns `true` if the request should be blocked.
 */
export function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry) {
    rateLimitStore.set(ip, { count: 1, firstAttempt: now });
    return false;
  }

  // If the window has expired, reset
  if (now - entry.firstAttempt > WINDOW_MS) {
    rateLimitStore.set(ip, { count: 1, firstAttempt: now });
    return false;
  }

  entry.count++;

  return entry.count > MAX_ATTEMPTS;
}

/**
 * Reset the rate limit for an IP (e.g., on successful login).
 */
export function resetRateLimit(ip: string): void {
  rateLimitStore.delete(ip);
}

/**
 * Get the remaining wait time in seconds for a rate-limited IP.
 */
export function getRateLimitResetSeconds(ip: string): number {
  const entry = rateLimitStore.get(ip);
  if (!entry) return 0;
  const elapsed = Date.now() - entry.firstAttempt;
  return Math.max(0, Math.ceil((WINDOW_MS - elapsed) / 1000));
}
