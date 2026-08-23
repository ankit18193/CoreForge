import { ErrorClassifier } from '../classifier/ErrorClassifier';
import { ErrorCauseDescriptor } from '../types/exceptionTypes';

export class ErrorCauseNormalizer {
  public static normalizeCause(error: unknown, maxDepth = 5): ErrorCauseDescriptor | undefined {
    if (typeof error !== 'object' || error === null) {
      return undefined;
    }

    const candidate = error as Record<string, unknown>;
    const rawCause = candidate.cause;
    if (!rawCause) {
      return undefined;
    }

    return ErrorCauseNormalizer._extractCause(
      rawCause,
      new Set<object>([error as object]),
      1,
      maxDepth,
    );
  }

  private static _extractCause(
    cause: unknown,
    visited: Set<object>,
    currentDepth: number,
    maxDepth: number,
  ): ErrorCauseDescriptor | undefined {
    if (currentDepth > maxDepth || cause === null || cause === undefined) {
      return undefined;
    }

    if (typeof cause !== 'object') {
      return {
        message: String(cause),
        category: 'INTERNAL',
        code: 'CF-INTERNAL-ERROR',
      };
    }

    const causeObj = cause as object;
    if (visited.has(causeObj)) {
      return {
        message: '[Circular Cause]',
        category: 'INTERNAL',
        code: 'CF-INTERNAL-ERROR',
      };
    }

    visited.add(causeObj);

    const classification = ErrorClassifier.classify(cause);
    const candidate = cause as Record<string, unknown>;
    const message =
      typeof candidate.message === 'string' ? candidate.message : 'Underlying cause error';

    return {
      code: classification.code,
      category: classification.category,
      message,
    };
  }
}
