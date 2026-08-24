import { RateLimitDecision, RateLimitPolicy } from '@coreforge/contracts';

interface WindowEntry {
  timestamp: number;
  cost: number;
}

export class SlidingWindowAlgorithm {
  private readonly _states = new Map<string, WindowEntry[]>();

  public consume(
    key: string,
    policy: RateLimitPolicy,
    cost: number,
    dryRun = false,
    now = Date.now(),
  ): RateLimitDecision {
    const windowStart = now - policy.windowMs;
    const entries = this._states.get(key) || [];

    // Filter out expired entries
    const validEntries = entries.filter((e) => e.timestamp > windowStart);
    if (!dryRun) {
      this._states.set(key, validEntries);
    }

    const currentConsumed = validEntries.reduce((sum, e) => sum + e.cost, 0);
    const oldestTimestamp = validEntries.length > 0 ? validEntries[0].timestamp : now;
    const resetAt = oldestTimestamp + policy.windowMs;

    if (dryRun) {
      const allowed = currentConsumed + cost <= policy.limit;
      const remaining = allowed
        ? Math.max(0, policy.limit - (currentConsumed + cost))
        : Math.max(0, policy.limit - currentConsumed);
      const retryAfterMs = allowed ? undefined : Math.max(0, resetAt - now);

      return Object.freeze({
        allowed,
        limit: policy.limit,
        remaining,
        consumed: currentConsumed,
        retryAfterMs,
        resetAt,
      });
    }

    if (currentConsumed + cost <= policy.limit) {
      validEntries.push({ timestamp: now, cost });
      const totalConsumed = currentConsumed + cost;
      return Object.freeze({
        allowed: true,
        limit: policy.limit,
        remaining: Math.max(0, policy.limit - totalConsumed),
        consumed: totalConsumed,
        resetAt,
      });
    }

    const retryAfterMs = Math.max(0, resetAt - now);
    return Object.freeze({
      allowed: false,
      limit: policy.limit,
      remaining: Math.max(0, policy.limit - currentConsumed),
      consumed: currentConsumed,
      retryAfterMs,
      resetAt,
    });
  }

  public reset(key: string): void {
    this._states.delete(key);
  }

  public clear(): void {
    this._states.clear();
  }
}
