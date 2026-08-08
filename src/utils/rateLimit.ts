interface RateLimitRecord {
  timestamps: number[];
}

// In-memory store for rate limits
const rateLimitMap = new Map<string, RateLimitRecord>();

// Clean up old entries every 2 minutes to prevent memory leaks
if (typeof globalThis !== "undefined") {
  const globalAny = globalThis as any;
  if (!globalAny.rateLimitCleanupInterval) {
    globalAny.rateLimitCleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [ip, record] of rateLimitMap.entries()) {
        // Filter out timestamps older than 60 seconds (1 minute window)
        record.timestamps = record.timestamps.filter((t) => now - t < 60000);
        if (record.timestamps.length === 0) {
          rateLimitMap.delete(ip);
        }
      }
    }, 2 * 60 * 1000);
  }
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Basic in-memory rate limiter.
 * Default: 5 requests per 1 minute window.
 */
export function rateLimit(
  ip: string,
  limit: number = 5,
  windowMs: number = 60 * 1000
): RateLimitResult {
  const now = Date.now();

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { timestamps: [] });
  }

  const record = rateLimitMap.get(ip)!;

  // Filter out timestamps outside the window
  record.timestamps = record.timestamps.filter((t) => now - t < windowMs);

  const currentCount = record.timestamps.length;
  const remaining = Math.max(0, limit - currentCount);
  const reset = record.timestamps.length > 0 ? record.timestamps[0] + windowMs : now + windowMs;

  if (currentCount >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      reset,
    };
  }

  // Record the current timestamp
  record.timestamps.push(now);

  return {
    success: true,
    limit,
    remaining: limit - 1 - currentCount,
    reset: now + windowMs,
  };
}
