import { RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW_MS } from './constants.js';

/**
 * Rate limiting utilities
 */

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Checks if a key has exceeded the rate limit
 */
export function isRateLimited(
  key: string,
  limit = RATE_LIMIT_REQUESTS,
  windowMs = RATE_LIMIT_WINDOW_MS
): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  
  entry.count += 1;
  return entry.count > limit;
}

/**
 * Last low performance alert timestamp
 */
export let lastLowPerformanceAlertAt: number | null = null;

/**
 * Updates the last low performance alert timestamp
 */
export function updateLastLowPerformanceAlert(timestamp: number) {
  lastLowPerformanceAlertAt = timestamp;
}
