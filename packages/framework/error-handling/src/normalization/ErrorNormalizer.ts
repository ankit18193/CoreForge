import { CauseSanitizer } from './CauseSanitizer';
import { ErrorClassifier } from '../classification/ErrorClassifier';
import { ErrorSanitizer } from '../sanitization/ErrorSanitizer';
import {
  ApplicationError,
  ApplicationErrorCategory,
  ErrorProcessingOptions,
} from '../types/errorHandlingTypes';

export class ErrorNormalizer {
  public static normalize(
    error: unknown,
    options?: ErrorProcessingOptions,
    customSensitiveKeys?: readonly string[],
  ): ApplicationError {
    const includeStack = options?.includeStack ?? false;
    const maxCauseDepth = options?.maxCauseDepth ?? 5;
    const timestamp = Date.now();

    // 1. null or undefined
    if (error === null || error === undefined) {
      return Object.freeze({
        name: 'Error',
        message: 'Unknown error occurred (null or undefined was thrown)',
        code: 'CF-UNKNOWN-ERROR',
        category: 'UNKNOWN' as ApplicationErrorCategory,
        timestamp,
      });
    }

    // 2. Primitive string
    if (typeof error === 'string') {
      return Object.freeze({
        name: 'Error',
        message: error,
        code: 'CF-UNKNOWN-ERROR',
        category: 'UNKNOWN' as ApplicationErrorCategory,
        timestamp,
      });
    }

    // 3. Primitive number or boolean or symbol
    if (typeof error === 'number' || typeof error === 'boolean' || typeof error === 'symbol') {
      return Object.freeze({
        name: 'Error',
        message: String(error),
        code: 'CF-UNKNOWN-ERROR',
        category: 'UNKNOWN' as ApplicationErrorCategory,
        timestamp,
      });
    }

    // 4. Object or Error instance
    const category = ErrorClassifier.classify(error);
    const obj = error as Record<string, unknown>;

    const name = typeof obj.name === 'string' && obj.name ? obj.name : 'Error';
    const message = typeof obj.message === 'string' ? obj.message : String(error);
    const code = typeof obj.code === 'string' && obj.code ? obj.code : 'CF-APPLICATION-ERROR';

    const details =
      obj.details !== undefined
        ? ErrorSanitizer.sanitize(obj.details, new WeakSet<object>(), customSensitiveKeys)
        : undefined;

    const stack = includeStack && typeof obj.stack === 'string' ? obj.stack : undefined;

    const rawCause = 'cause' in obj ? obj.cause : undefined;
    const cause = CauseSanitizer.sanitizeCause(
      rawCause,
      maxCauseDepth,
      1,
      new WeakSet<object>(),
      customSensitiveKeys,
    );

    return Object.freeze({
      name,
      message,
      code,
      category,
      details,
      stack,
      cause,
      timestamp,
    });
  }
}
