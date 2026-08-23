import { ErrorCauseNormalizer } from './ErrorCauseNormalizer';
import { ErrorDescriptorFactory } from './ErrorDescriptorFactory';
import { ErrorClassifier } from '../classifier/ErrorClassifier';
import { ErrorDescriptor, ExceptionPipelineOptions } from '../types/exceptionTypes';

const SENSITIVE_KEY_REGEX = /password|token|secret|authorization|auth|cookie|credential|key/i;

export class ErrorNormalizer {
  public static normalize(error: unknown, options: ExceptionPipelineOptions = {}): ErrorDescriptor {
    const exposeStack = options.exposeStack ?? false;

    // 1. If error is already an ErrorDescriptor returned by a custom ExceptionHandler
    if (
      typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      'category' in error &&
      'code' in error &&
      'message' in error
    ) {
      const desc = error as ErrorDescriptor;
      const sanitizedDetails = ErrorNormalizer.sanitizeDetails(desc.details);
      return ErrorDescriptorFactory.create({
        code: desc.code,
        category: desc.category,
        status: desc.status,
        message: desc.message,
        details: sanitizedDetails,
        cause: desc.cause,
        stack: exposeStack ? desc.stack : undefined,
        timestamp: desc.timestamp || Date.now(),
      });
    }

    const classification = ErrorClassifier.classify(error);

    let message = 'Internal Server Error';
    let stack: string | undefined;
    let rawDetails: unknown;

    if (typeof error === 'string') {
      message = error;
    } else if (typeof error === 'object' && error !== null) {
      const candidate = error as Record<string, unknown>;
      if (typeof candidate.message === 'string') {
        message = candidate.message;
      }
      if (typeof candidate.stack === 'string' && exposeStack) {
        stack = candidate.stack;
      }
      rawDetails = candidate.details;
    }

    const sanitizedDetails = ErrorNormalizer.sanitizeDetails(rawDetails);
    const cause = ErrorCauseNormalizer.normalizeCause(error);

    return ErrorDescriptorFactory.create({
      code: classification.code,
      category: classification.category,
      status: classification.status,
      message,
      details: sanitizedDetails,
      cause,
      stack,
      timestamp: Date.now(),
    });
  }

  public static sanitizeDetails(
    details: unknown,
    visited = new Set<object>(),
    depth = 0,
    maxDepth = 5,
  ): Readonly<Record<string, unknown>> | undefined {
    if (typeof details !== 'object' || details === null || depth > maxDepth) {
      return undefined;
    }

    if (visited.has(details as object)) {
      return undefined;
    }

    visited.add(details as object);

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(details as Record<string, unknown>)) {
      if (SENSITIVE_KEY_REGEX.test(key)) {
        result[key] = '[REDACTED]';
        continue;
      }

      const type = typeof value;
      if (type === 'function' || type === 'symbol') {
        continue;
      }

      if (type === 'object' && value !== null) {
        if (Array.isArray(value)) {
          result[key] = value
            .filter((item) => typeof item !== 'function' && typeof item !== 'symbol')
            .map((item) =>
              typeof item === 'object' && item !== null
                ? ErrorNormalizer.sanitizeDetails(item, visited, depth + 1, maxDepth)
                : item,
            );
        } else {
          result[key] = ErrorNormalizer.sanitizeDetails(value, visited, depth + 1, maxDepth);
        }
      } else {
        result[key] = value;
      }
    }

    return Object.freeze(result);
  }
}
