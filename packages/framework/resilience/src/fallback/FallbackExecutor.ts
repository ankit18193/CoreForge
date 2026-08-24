import { FallbackError } from '../errors/ResilienceErrors';

export class FallbackExecutor {
  public static async executeFallback<T>(
    fallback: (error: unknown, signal: AbortSignal) => Promise<unknown> | unknown,
    error: unknown,
    signal: AbortSignal,
    onFallbackSuccess?: () => void,
    onFallbackFailure?: () => void,
  ): Promise<T> {
    try {
      const result = await fallback(error, signal);
      onFallbackSuccess?.();
      return result as T;
    } catch (fbErr: unknown) {
      onFallbackFailure?.();
      throw new FallbackError('Fallback execution failed', {
        originalError: error,
        fallbackError: fbErr,
      });
    }
  }
}
