import { CoreForgeError } from '@coreforge/errors';
import { TransportError } from '@coreforge/transport';

export class HttpError extends TransportError {
  constructor(message: string, code = 'CF-HTTP', details?: unknown) {
    super(message, code, details);
    this.name = 'HttpError';
  }
}

export class HttpConfigurationError extends HttpError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-HTTP-CONFIGURATION', details);
    this.name = 'HttpConfigurationError';
  }
}

export class HttpValidationError extends HttpError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-HTTP-VALIDATION', details);
    this.name = 'HttpValidationError';
  }
}

export class HttpRequestError extends HttpError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-HTTP-REQUEST', details);
    this.name = 'HttpRequestError';
  }
}

export class HttpResponseError extends HttpError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-HTTP-RESPONSE', details);
    this.name = 'HttpResponseError';
  }
}

export class HttpMappingError extends HttpError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-HTTP-MAPPING', details);
    this.name = 'HttpMappingError';
  }
}

export class HttpStateError extends HttpError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-HTTP-STATE', details);
    this.name = 'HttpStateError';
  }
}

export class HttpExecutionError extends HttpError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-HTTP-EXECUTION', details);
    this.name = 'HttpExecutionError';
  }
}

export class HttpCancellationError extends HttpError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-HTTP-CANCELLATION', details);
    this.name = 'HttpCancellationError';
  }
}

export class HttpTimeoutError extends HttpError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-HTTP-TIMEOUT', details);
    this.name = 'HttpTimeoutError';
  }
}

export { CoreForgeError, TransportError };
