// lib/rateLimit.js
// 簡易記憶體速率限制（單機）。正式多機部署時改用 Upstash Redis。
const buckets = new Map();

export function rateLimit(key, { max = 5, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const entry = buckets.get(key) || { count: 0, reset: now + windowMs };
  if (now > entry.reset) {
    entry.count = 0;
    entry.reset = now + windowMs;
  }
  entry.count += 1;
  buckets.set(key, entry);
  return { ok: entry.count <= max, remaining: Math.max(0, max - entry.count) };
}
