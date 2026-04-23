// Lightweight in-memory rate limiter for per-instance protection.
// Non-distributed — acceptable for small/medium traffic. For production scale,
// swap for Upstash Redis (@upstash/ratelimit) via env var.

type Bucket = { tokens: number; reset: number };

const BUCKETS = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const bucket = BUCKETS.get(key);

  if (!bucket || bucket.reset < now) {
    const reset = now + windowMs;
    BUCKETS.set(key, { tokens: limit - 1, reset });
    maybeCleanup(now);
    return { ok: true, remaining: limit - 1, resetAt: reset };
  }

  if (bucket.tokens <= 0) {
    return { ok: false, remaining: 0, resetAt: bucket.reset };
  }

  bucket.tokens -= 1;
  return { ok: true, remaining: bucket.tokens, resetAt: bucket.reset };
}

let lastCleanup = 0;
function maybeCleanup(now: number) {
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [key, bucket] of BUCKETS) {
    if (bucket.reset < now) BUCKETS.delete(key);
  }
}

export function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

export function rateLimitResponse(result: RateLimitResult) {
  const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
  return new Response(
    JSON.stringify({ error: "Trop de requêtes. Réessayez plus tard." }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
      },
    }
  );
}
