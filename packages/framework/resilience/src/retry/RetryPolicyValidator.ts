import { ResilienceRetryPolicy } from '@coreforge/contracts';

import { RetryConfigurationError } from '../errors/ResilienceErrors';

export class RetryPolicyValidator {
  public static validate(policy: unknown): ResilienceRetryPolicy {
    if (!policy || typeof policy !== 'object') {
      throw new RetryConfigurationError('Retry policy must be an object', { policy });
    }

    const p = policy as Partial<ResilienceRetryPolicy>;

    if (typeof p.maxAttempts !== 'number' || !Number.isFinite(p.maxAttempts) || p.maxAttempts < 1) {
      throw new RetryConfigurationError('Retry maxAttempts must be an integer >= 1', {
        maxAttempts: p.maxAttempts,
      });
    }

    if (p.baseDelayMs !== undefined) {
      if (
        typeof p.baseDelayMs !== 'number' ||
        !Number.isFinite(p.baseDelayMs) ||
        p.baseDelayMs < 0
      ) {
        throw new RetryConfigurationError('Retry baseDelayMs must be a number >= 0', {
          baseDelayMs: p.baseDelayMs,
        });
      }
    }

    if (p.multiplier !== undefined) {
      if (typeof p.multiplier !== 'number' || !Number.isFinite(p.multiplier) || p.multiplier < 1) {
        throw new RetryConfigurationError('Retry multiplier must be a number >= 1', {
          multiplier: p.multiplier,
        });
      }
    }

    if (p.maxDelayMs !== undefined) {
      if (typeof p.maxDelayMs !== 'number' || !Number.isFinite(p.maxDelayMs) || p.maxDelayMs < 0) {
        throw new RetryConfigurationError('Retry maxDelayMs must be a number >= 0', {
          maxDelayMs: p.maxDelayMs,
        });
      }
    }

    if (p.jitter !== undefined) {
      if (
        typeof p.jitter !== 'number' ||
        !Number.isFinite(p.jitter) ||
        p.jitter < 0 ||
        p.jitter > 1
      ) {
        throw new RetryConfigurationError('Retry jitter must be a number between 0 and 1', {
          jitter: p.jitter,
        });
      }
    }

    return Object.freeze({
      maxAttempts: Math.floor(p.maxAttempts),
      baseDelayMs: p.baseDelayMs,
      multiplier: p.multiplier,
      maxDelayMs: p.maxDelayMs,
      jitter: p.jitter,
    });
  }
}
