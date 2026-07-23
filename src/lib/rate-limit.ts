// In-memory sliding-window rate limiter. Per-process and reset on restart —
// fine for a single local/VPS instance; swap for Redis/Upstash before any
// serverless or multi-instance deployment.

const buckets = new Map<string, number[]>();
let lastSweep = Date.now();

const SWEEP_INTERVAL_MS = 10 * 60 * 1000;

function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, hits] of buckets) {
    if (hits.length === 0 || now - hits[hits.length - 1] > SWEEP_INTERVAL_MS) {
      buckets.delete(key);
    }
  }
}

/** Returns true if the call is allowed, false if rate-limited. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  sweep(now);
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  return true;
}

/** Test helper. */
export function resetRateLimits(): void {
  buckets.clear();
}
