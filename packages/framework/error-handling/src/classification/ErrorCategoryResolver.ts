import { ApplicationErrorCategory } from '../types/errorHandlingTypes';

export class ErrorCategoryResolver {
  public static resolve(error: unknown): ApplicationErrorCategory {
    if (!error || (typeof error !== 'object' && typeof error !== 'function')) {
      return 'UNKNOWN';
    }

    const err = error as Record<string, unknown>;
    const name = typeof err.name === 'string' ? err.name : '';
    const code = typeof err.code === 'string' ? err.code : '';
    const message = typeof err.message === 'string' ? err.message : '';

    // 1. Cancellation Precedence
    if (
      name === 'AbortError' ||
      name === 'ExecutionCancellationError' ||
      name === 'CommandCancellationError' ||
      name === 'QueryCancellationError' ||
      name === 'EventCancellationError' ||
      name === 'ApplicationCancellationError' ||
      code.includes('CANCEL') ||
      code.includes('ABORT') ||
      message.toLowerCase().includes('aborted by execution context') ||
      message.toLowerCase().includes('operation cancelled')
    ) {
      return 'CANCELLED';
    }

    // 2. Timeout Precedence
    if (
      name === 'TimeoutError' ||
      name === 'ExecutionTimeoutError' ||
      code.includes('TIMEOUT') ||
      message.toLowerCase().includes('timed out')
    ) {
      return 'TIMEOUT';
    }

    // 3. Validation
    if (name.includes('Validation') || code.includes('VALIDATION')) {
      return 'VALIDATION';
    }

    // 4. Authentication
    if (
      name.includes('Authentication') ||
      name.includes('Unauthenticated') ||
      code.includes('AUTHENTICATION') ||
      code.includes('UNAUTHENTICATED')
    ) {
      return 'AUTHENTICATION';
    }

    // 5. Authorization
    if (
      name.includes('Authorization') ||
      name.includes('Forbidden') ||
      code.includes('AUTHORIZATION') ||
      code.includes('FORBIDDEN')
    ) {
      return 'AUTHORIZATION';
    }

    // 6. Not Found
    if (name.includes('NotFound') || code.includes('NOT_FOUND') || code.includes('NOT-FOUND')) {
      return 'NOT_FOUND';
    }

    // 7. Conflict
    if (
      name.includes('Conflict') ||
      name.includes('Duplicate') ||
      code.includes('CONFLICT') ||
      code.includes('DUPLICATE')
    ) {
      return 'CONFLICT';
    }

    // 8. Rate Limited
    if (
      name.includes('RateLimit') ||
      name.includes('TooManyRequests') ||
      code.includes('RATE_LIMIT') ||
      code.includes('RATE-LIMIT')
    ) {
      return 'RATE_LIMITED';
    }

    // 9. Dependency
    if (name.includes('Dependency') || name.includes('Gateway') || code.includes('DEPENDENCY')) {
      return 'DEPENDENCY';
    }

    // 10. Internal Errors
    if (
      name === 'TypeError' ||
      name === 'RangeError' ||
      name === 'ReferenceError' ||
      name === 'SyntaxError' ||
      name === 'InternalError' ||
      code.includes('INTERNAL')
    ) {
      return 'INTERNAL';
    }

    return 'UNKNOWN';
  }
}
