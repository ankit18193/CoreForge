import { EventConfigurationError } from '../errors/EventErrors';
import { EventRetryPolicy } from '../types/eventTypes';

export class RetryPolicy {
  public static validate(policy?: EventRetryPolicy): void {
    if (!policy) {
      return;
    }

    if (typeof policy.maxAttempts !== 'number' || policy.maxAttempts < 1) {
      throw new EventConfigurationError('EventRetryPolicy.maxAttempts must be a number >= 1.');
    }

    if (
      policy.delayMs !== undefined &&
      (typeof policy.delayMs !== 'number' || policy.delayMs < 0)
    ) {
      throw new EventConfigurationError('EventRetryPolicy.delayMs must be a number >= 0.');
    }
  }
}
