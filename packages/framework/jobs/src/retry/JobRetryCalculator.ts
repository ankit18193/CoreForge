import { JobRetryPolicy } from '@coreforge/contracts';

import { JobRetryError } from '../errors/JobErrors';

export class JobRetryCalculator {
  public static validatePolicy(policy?: JobRetryPolicy): JobRetryPolicy | undefined {
    if (!policy) {
      return undefined;
    }

    if (
      typeof policy.maxAttempts !== 'number' ||
      !Number.isFinite(policy.maxAttempts) ||
      policy.maxAttempts < 1
    ) {
      throw new JobRetryError('Job retry maxAttempts must be a number >= 1', { policy });
    }

    if (policy.backoffMs !== undefined) {
      if (
        typeof policy.backoffMs !== 'number' ||
        !Number.isFinite(policy.backoffMs) ||
        policy.backoffMs < 0
      ) {
        throw new JobRetryError('Job retry backoffMs must be a non-negative number', { policy });
      }
    }

    if (policy.backoffMultiplier !== undefined) {
      if (
        typeof policy.backoffMultiplier !== 'number' ||
        !Number.isFinite(policy.backoffMultiplier) ||
        policy.backoffMultiplier < 1
      ) {
        throw new JobRetryError('Job retry backoffMultiplier must be a number >= 1', { policy });
      }
    }

    if (policy.maxBackoffMs !== undefined) {
      if (
        typeof policy.maxBackoffMs !== 'number' ||
        !Number.isFinite(policy.maxBackoffMs) ||
        policy.maxBackoffMs < 0
      ) {
        throw new JobRetryError('Job retry maxBackoffMs must be a non-negative number', { policy });
      }
    }

    return policy;
  }

  public static shouldRetry(attempt: number, policy?: JobRetryPolicy): boolean {
    if (!policy) {
      return false;
    }
    return attempt < policy.maxAttempts;
  }

  public static calculateDelayMs(attempt: number, policy?: JobRetryPolicy): number {
    if (!policy) {
      return 0;
    }

    const baseBackoff = policy.backoffMs ?? 0;
    if (baseBackoff === 0) {
      return 0;
    }

    const multiplier = policy.backoffMultiplier ?? 2;
    const exponent = Math.max(0, attempt - 1);
    const calculated = baseBackoff * Math.pow(multiplier, exponent);

    if (policy.maxBackoffMs !== undefined) {
      return Math.min(calculated, policy.maxBackoffMs);
    }

    return calculated;
  }
}
