import { HttpError } from './HttpErrors';

export class HttpMiddlewareError extends HttpError {
  constructor(message: string, code = 'CF-HTTP-MIDDLEWARE', cause?: Error) {
    super(message, code, cause);
    this.name = 'HttpMiddlewareError';
  }
}

export class HttpMiddlewareConfigurationError extends HttpMiddlewareError {
  constructor(message: string, code = 'CF-HTTP-MIDDLEWARE-CONFIG', cause?: Error) {
    super(message, code, cause);
    this.name = 'HttpMiddlewareConfigurationError';
  }
}

export class HttpMiddlewareRegistrationError extends HttpMiddlewareError {
  constructor(message: string, code = 'CF-HTTP-MIDDLEWARE-REGISTRATION', cause?: Error) {
    super(message, code, cause);
    this.name = 'HttpMiddlewareRegistrationError';
  }
}

export class HttpMiddlewareDuplicateError extends HttpMiddlewareError {
  public readonly middlewareId: string;

  constructor(middlewareId: string, message?: string, cause?: Error) {
    super(
      message ?? `HTTP middleware with ID '${middlewareId}' is already registered`,
      'CF-HTTP-MIDDLEWARE-DUPLICATE',
      cause,
    );
    this.name = 'HttpMiddlewareDuplicateError';
    this.middlewareId = middlewareId;
  }
}

export class HttpMiddlewareValidationError extends HttpMiddlewareError {
  constructor(message: string, code = 'CF-HTTP-MIDDLEWARE-VALIDATION', cause?: Error) {
    super(message, code, cause);
    this.name = 'HttpMiddlewareValidationError';
  }
}

export class HttpMiddlewareStateError extends HttpMiddlewareError {
  constructor(message: string, code = 'CF-HTTP-MIDDLEWARE-STATE', cause?: Error) {
    super(message, code, cause);
    this.name = 'HttpMiddlewareStateError';
  }
}

export class HttpMiddlewareExecutionError extends HttpMiddlewareError {
  public readonly middlewareId?: string | undefined;

  constructor(message: string, middlewareId?: string, cause?: Error) {
    super(message, 'CF-HTTP-MIDDLEWARE-EXECUTION', cause);
    this.name = 'HttpMiddlewareExecutionError';
    this.middlewareId = middlewareId;
  }
}

export class HttpMiddlewareCancellationError extends HttpMiddlewareError {
  public readonly middlewareId?: string | undefined;

  constructor(message: string, middlewareId?: string, cause?: Error) {
    super(message, 'CF-HTTP-MIDDLEWARE-CANCELLATION', cause);
    this.name = 'HttpMiddlewareCancellationError';
    this.middlewareId = middlewareId;
  }
}

export class HttpMiddlewareTimeoutError extends HttpMiddlewareError {
  public readonly middlewareId?: string | undefined;
  public readonly timeoutMs?: number | undefined;

  constructor(message: string, middlewareId?: string, timeoutMs?: number, cause?: Error) {
    super(message, 'CF-HTTP-MIDDLEWARE-TIMEOUT', cause);
    this.name = 'HttpMiddlewareTimeoutError';
    this.middlewareId = middlewareId;
    this.timeoutMs = timeoutMs;
  }
}

export class HttpMiddlewarePipelineError extends HttpMiddlewareError {
  constructor(message: string, code = 'CF-HTTP-MIDDLEWARE-PIPELINE', cause?: Error) {
    super(message, code, cause);
    this.name = 'HttpMiddlewarePipelineError';
  }
}
