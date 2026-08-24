import { RateLimitDecision, RateLimitPolicy, RateLimitProvider } from '@coreforge/contracts';

import { FixedWindowAlgorithm } from '../algorithms/FixedWindowAlgorithm';
import { SlidingWindowAlgorithm } from '../algorithms/SlidingWindowAlgorithm';
import { TokenBucketAlgorithm } from '../algorithms/TokenBucketAlgorithm';
import { RateLimitKey } from '../key/RateLimitKey';
import { RateLimitPolicyValidator } from '../policy/RateLimitPolicyValidator';

export class MemoryRateLimitProvider implements RateLimitProvider {
  private readonly _fixedWindow = new FixedWindowAlgorithm();
  private readonly _slidingWindow = new SlidingWindowAlgorithm();
  private readonly _tokenBucket = new TokenBucketAlgorithm();

  public async consume(
    key: string,
    policy: RateLimitPolicy,
    cost: number,
    dryRun = false,
  ): Promise<RateLimitDecision> {
    const validKey = RateLimitKey.validate(key);
    const validPolicy = RateLimitPolicyValidator.validatePolicy(policy);
    const validCost = RateLimitPolicyValidator.validateCost(cost);

    switch (validPolicy.algorithm) {
      case 'FIXED_WINDOW':
        return this._fixedWindow.consume(validKey, validPolicy, validCost, dryRun);
      case 'SLIDING_WINDOW':
        return this._slidingWindow.consume(validKey, validPolicy, validCost, dryRun);
      case 'TOKEN_BUCKET':
        return this._tokenBucket.consume(validKey, validPolicy, validCost, dryRun);
    }
  }

  public async reset(key: string): Promise<void> {
    const validKey = RateLimitKey.validate(key);
    this._fixedWindow.reset(validKey);
    this._slidingWindow.reset(validKey);
    this._tokenBucket.reset(validKey);
  }

  public async clear(): Promise<void> {
    this._fixedWindow.clear();
    this._slidingWindow.clear();
    this._tokenBucket.clear();
  }
}
