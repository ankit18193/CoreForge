import { ResilienceRetryPolicy } from '@coreforge/contracts';

export class RetryCalculator {
  public static calculateDelay(attempt: number, policy: ResilienceRetryPolicy): number {
    const baseDelay = policy.baseDelayMs ?? 100;
    const multiplier = policy.multiplier ?? 2;
    const maxDelay = policy.maxDelayMs ?? 30000;
    const jitter = policy.jitter ?? 0;

    // attempt 1 failed, so backoff for attempt 2 has exponent (2 - 1) = 1
    const exponent = Math.max(0, attempt - 1);
    const calculated = baseDelay * Math.pow(multiplier, exponent);
    let delay = Math.min(calculated, maxDelay);

    if (jitter > 0) {
      // Bounded jitter factor between [1 - jitter, 1 + jitter]
      const factor = 1 + (Math.random() * 2 - 1) * jitter;
      delay = Math.min(delay * factor, maxDelay);
    }

    return Math.max(0, Math.round(delay));
  }
}
