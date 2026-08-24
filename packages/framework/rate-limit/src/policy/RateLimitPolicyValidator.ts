import { RateLimitPolicy } from '@coreforge/contracts';

import { RateLimitCostError, RateLimitPolicyError } from '../errors/RateLimitErrors';

const VALID_ALGORITHMS = new Set(['FIXED_WINDOW', 'SLIDING_WINDOW', 'TOKEN_BUCKET']);

export class RateLimitPolicyValidator {
  public static validatePolicy(policy: unknown): RateLimitPolicy {
    if (!policy || typeof policy !== 'object') {
      throw new RateLimitPolicyError('Rate limit policy must be an object', { policy });
    }

    const p = policy as Partial<RateLimitPolicy>;

    if (typeof p.limit !== 'number' || !Number.isFinite(p.limit) || p.limit <= 0) {
      throw new RateLimitPolicyError('Rate limit policy "limit" must be a positive number (> 0)', {
        limit: p.limit,
      });
    }

    if (typeof p.windowMs !== 'number' || !Number.isFinite(p.windowMs) || p.windowMs <= 0) {
      throw new RateLimitPolicyError(
        'Rate limit policy "windowMs" must be a positive number (> 0)',
        { windowMs: p.windowMs },
      );
    }

    if (!p.algorithm || !VALID_ALGORITHMS.has(p.algorithm)) {
      throw new RateLimitPolicyError(
        `Rate limit policy "algorithm" must be one of: FIXED_WINDOW, SLIDING_WINDOW, TOKEN_BUCKET`,
        { algorithm: p.algorithm },
      );
    }

    if (p.burstCapacity !== undefined) {
      if (
        typeof p.burstCapacity !== 'number' ||
        !Number.isFinite(p.burstCapacity) ||
        p.burstCapacity <= 0
      ) {
        throw new RateLimitPolicyError(
          'Rate limit policy "burstCapacity" must be a positive number (> 0)',
          { burstCapacity: p.burstCapacity },
        );
      }
    }

    return Object.freeze({
      limit: p.limit,
      windowMs: p.windowMs,
      algorithm: p.algorithm,
      burstCapacity: p.burstCapacity,
    });
  }

  public static validateCost(cost: unknown): number {
    if (cost === undefined) {
      return 1;
    }

    if (typeof cost !== 'number' || !Number.isFinite(cost) || cost <= 0) {
      throw new RateLimitCostError('Rate limit cost must be a positive finite number (> 0)', {
        cost,
      });
    }

    return cost;
  }
}
