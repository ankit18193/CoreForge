import { RateLimitDecision, RateLimitPolicy } from '@coreforge/contracts';

interface BucketState {
  tokens: number;
  lastRefill: number;
}

export class TokenBucketAlgorithm {
  private readonly _states = new Map<string, BucketState>();

  public consume(
    key: string,
    policy: RateLimitPolicy,
    cost: number,
    dryRun = false,
    now = Date.now(),
  ): RateLimitDecision {
    const capacity = policy.burstCapacity ?? policy.limit;
    const refillRate = policy.limit / policy.windowMs; // tokens per ms

    let state = this._states.get(key);
    if (!state) {
      state = { tokens: capacity, lastRefill: now };
      if (!dryRun) {
        this._states.set(key, state);
      }
    } else {
      // Calculate token refill
      const elapsed = Math.max(0, now - state.lastRefill);
      const refilledTokens = elapsed * refillRate;
      state.tokens = Math.min(capacity, state.tokens + refilledTokens);
      state.lastRefill = now;
    }

    if (dryRun) {
      const allowed = state.tokens >= cost;
      const remaining = allowed ? Math.floor(state.tokens - cost) : Math.floor(state.tokens);
      const consumed = Math.round((capacity - state.tokens) * 100) / 100;
      const needed = cost - state.tokens;
      const retryAfterMs = allowed ? undefined : Math.ceil(needed / refillRate);
      const resetAt = now + Math.ceil((capacity - state.tokens) / refillRate);

      return Object.freeze({
        allowed,
        limit: policy.limit,
        remaining,
        consumed,
        retryAfterMs,
        resetAt,
      });
    }

    if (state.tokens >= cost) {
      state.tokens -= cost;
      const consumed = Math.round((capacity - state.tokens) * 100) / 100;
      const resetAt = now + Math.ceil((capacity - state.tokens) / refillRate);

      return Object.freeze({
        allowed: true,
        limit: policy.limit,
        remaining: Math.floor(state.tokens),
        consumed,
        resetAt,
      });
    }

    const needed = cost - state.tokens;
    const retryAfterMs = Math.ceil(needed / refillRate);
    const consumed = Math.round((capacity - state.tokens) * 100) / 100;
    const resetAt = now + retryAfterMs;

    return Object.freeze({
      allowed: false,
      limit: policy.limit,
      remaining: Math.floor(state.tokens),
      consumed,
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
