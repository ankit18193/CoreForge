import { ErrorSanitizer } from '../sanitization/ErrorSanitizer';

export class CauseSanitizer {
  public static sanitizeCause(
    cause: unknown,
    maxDepth = 5,
    currentDepth = 1,
    seen = new WeakSet<object>(),
    sensitiveKeys?: readonly string[],
  ): unknown {
    if (cause === null || cause === undefined) {
      return undefined;
    }

    if (typeof cause !== 'object' && typeof cause !== 'function') {
      return cause;
    }

    if (seen.has(cause as object)) {
      return '[Circular]';
    }
    seen.add(cause as object);

    if (currentDepth > maxDepth) {
      return '[Truncated Cause]';
    }

    if (cause instanceof Error) {
      const sanitizedDetails =
        cause && 'details' in cause
          ? ErrorSanitizer.sanitize((cause as { details: unknown }).details, seen, sensitiveKeys)
          : undefined;

      const nestedCause =
        'cause' in cause
          ? this.sanitizeCause(
              (cause as { cause: unknown }).cause,
              maxDepth,
              currentDepth + 1,
              seen,
              sensitiveKeys,
            )
          : undefined;

      return Object.freeze({
        name: cause.name || 'Error',
        message: cause.message || '',
        code:
          typeof (cause as { code?: unknown }).code === 'string'
            ? (cause as { code?: string }).code
            : undefined,
        details: sanitizedDetails,
        cause: nestedCause,
      });
    }

    return ErrorSanitizer.sanitize(cause, seen, sensitiveKeys);
  }
}
