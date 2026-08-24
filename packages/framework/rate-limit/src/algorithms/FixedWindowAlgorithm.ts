import { RateLimitDecision, RateLimitPolicy } from '@coreforge/contracts';

interface FixedWindowState {
  count: number;
  windowStart: number;
}

export class FixedWindowAlgorithm {
  private readonly _states = new Map<string, FixedWindowState>();

  public consume(
    key: string,
    policy: RateLimitPolicy,
    cost: number,
    dryRun = false,
    now = Date.now(),
  ): RateLimitDecision {
    const currentWindow = Math.floor(now / policy.windowMs) * policy.windowMs;
    const resetAt = currentWindow + policy.windowMs;

    let state = this._states.get(key);
    if (!state || state.windowStart !== currentWindow) {
      state = { count: 0, windowStart: currentWindow };
      if (!dryRun) {
        this._states.set(key, state);
      }
    }

    if (dryRun) {
      const allowed = state.count + cost <= policy.limit;
      const consumed = state.count;
      const remaining = allowed
        ? Math.max(0, policy.limit - (state.count + cost))
        : Math.max(0, policy.limit - state.count);
      const retryAfterMs = allowed ? undefined : Math.max(0, resetAt - now);

      return Object.freeze({
        allowed,
        limit: policy.limit,
        remaining,
        consumed,
        retryAfterMs,
        resetAt,
      });
    }

    if (state.count + cost <= policy.limit) {
      state.count += cost;
      return Object.freeze({
        allowed: true,
        limit: policy.limit,
        remaining: Math.max(0, policy.limit - state.count),
        consumed: state.count,
        resetAt,
      });
    }

    const retryAfterMs = Math.max(0, resetAt - now);
    return Object.freeze({
      allowed: false,
      limit: policy.limit,
      remaining: Math.max(0, policy.limit - state.count),
      consumed: state.count,
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
