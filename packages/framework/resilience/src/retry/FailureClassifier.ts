import { CancellationError } from '../errors/ResilienceErrors';

export class FailureClassifier {
  public static shouldRetry(
    error: unknown,
    attempt: number,
    userPredicate?: (error: unknown, attempt: number) => boolean,
    onClassifierError?: (err: unknown) => void,
  ): boolean {
    if (error instanceof CancellationError) {
      return false; // Caller cancellations are never retryable
    }

    if (userPredicate) {
      try {
        return Boolean(userPredicate(error, attempt));
      } catch (predErr: unknown) {
        onClassifierError?.(predErr);
        return false; // Safe fallback: do not retry on classifier error
      }
    }

    return true; // Default: retryable
  }
}
