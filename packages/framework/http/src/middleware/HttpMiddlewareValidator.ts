import type { HttpMiddleware, HttpMiddlewareOptions } from '@coreforge/contracts';

import { HttpMiddlewareValidationError } from '../errors/HttpMiddlewareErrors';

export class HttpMiddlewareValidator {
  public static validate<TContext = unknown, TResult = unknown>(
    middleware: unknown,
    options?: HttpMiddlewareOptions,
  ): HttpMiddleware<TContext, TResult> {
    if (!middleware || typeof middleware !== 'object') {
      throw new HttpMiddlewareValidationError(
        'HTTP middleware must be a non-null object implementing HttpMiddleware contract',
      );
    }

    const candidate = middleware as Partial<HttpMiddleware<TContext, TResult>>;

    if (typeof candidate.id !== 'string' || candidate.id.trim().length === 0) {
      throw new HttpMiddlewareValidationError('HTTP middleware id must be a non-empty string');
    }

    if (typeof candidate.execute !== 'function') {
      throw new HttpMiddlewareValidationError(
        `HTTP middleware '${candidate.id}' must provide an execute(context, next) function`,
      );
    }

    if (
      candidate.priority !== undefined &&
      (typeof candidate.priority !== 'number' || !Number.isFinite(candidate.priority))
    ) {
      throw new HttpMiddlewareValidationError(
        `HTTP middleware '${candidate.id}' priority must be a finite number`,
      );
    }

    if (candidate.name !== undefined && typeof candidate.name !== 'string') {
      throw new HttpMiddlewareValidationError(
        `HTTP middleware '${candidate.id}' name must be a string if specified`,
      );
    }

    if (options !== undefined) {
      if (!options || typeof options !== 'object') {
        throw new HttpMiddlewareValidationError(
          `HTTP middleware '${candidate.id}' options must be an object if provided`,
        );
      }

      if (
        options.priority !== undefined &&
        (typeof options.priority !== 'number' || !Number.isFinite(options.priority))
      ) {
        throw new HttpMiddlewareValidationError(
          `HTTP middleware '${candidate.id}' options.priority must be a finite number`,
        );
      }

      if (options.enabled !== undefined && typeof options.enabled !== 'boolean') {
        throw new HttpMiddlewareValidationError(
          `HTTP middleware '${candidate.id}' options.enabled must be a boolean if specified`,
        );
      }

      if (options.failureStrategy !== undefined) {
        const validStrategies = ['CONTINUE', 'STOP', 'FAIL_FAST'];
        if (!validStrategies.includes(options.failureStrategy)) {
          throw new HttpMiddlewareValidationError(
            `HTTP middleware '${candidate.id}' options.failureStrategy must be one of: ${validStrategies.join(', ')}`,
          );
        }
      }

      if (
        options.timeoutMs !== undefined &&
        (typeof options.timeoutMs !== 'number' ||
          !Number.isFinite(options.timeoutMs) ||
          options.timeoutMs <= 0)
      ) {
        throw new HttpMiddlewareValidationError(
          `HTTP middleware '${candidate.id}' options.timeoutMs must be a positive finite number`,
        );
      }
    }

    return candidate as HttpMiddleware<TContext, TResult>;
  }
}
