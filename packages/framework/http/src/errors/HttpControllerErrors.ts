import { HttpError } from './HttpErrors';

export class HttpControllerError extends HttpError {
  constructor(message: string, code = 'CF-HTTP-CONTROLLER', cause?: Error) {
    super(message, code, cause);
    this.name = 'HttpControllerError';
  }
}

export class HttpControllerConfigurationError extends HttpControllerError {
  constructor(message: string, cause?: Error) {
    super(message, 'CF-HTTP-CONTROLLER-CONFIG', cause);
    this.name = 'HttpControllerConfigurationError';
  }
}

export class HttpControllerRegistrationError extends HttpControllerError {
  constructor(message: string, cause?: Error) {
    super(message, 'CF-HTTP-CONTROLLER-REGISTRATION', cause);
    this.name = 'HttpControllerRegistrationError';
  }
}

export class HttpControllerDuplicateError extends HttpControllerError {
  public readonly controllerId: string;

  constructor(controllerId: string, message?: string, cause?: Error) {
    super(
      message ?? `HTTP controller with ID '${controllerId}' is already registered`,
      'CF-HTTP-CONTROLLER-DUPLICATE',
      cause,
    );
    this.name = 'HttpControllerDuplicateError';
    this.controllerId = controllerId;
  }
}

export class HttpControllerValidationError extends HttpControllerError {
  constructor(message: string, cause?: Error) {
    super(message, 'CF-HTTP-CONTROLLER-VALIDATION', cause);
    this.name = 'HttpControllerValidationError';
  }
}

export class HttpControllerStateError extends HttpControllerError {
  constructor(message: string, cause?: Error) {
    super(message, 'CF-HTTP-CONTROLLER-STATE', cause);
    this.name = 'HttpControllerStateError';
  }
}

export class HttpControllerExecutionError extends HttpControllerError {
  public readonly controllerId?: string | undefined;

  constructor(message: string, controllerId?: string, cause?: Error) {
    super(message, 'CF-HTTP-CONTROLLER-EXECUTION', cause);
    this.name = 'HttpControllerExecutionError';
    this.controllerId = controllerId;
  }
}

export class HttpControllerCancellationError extends HttpControllerError {
  public readonly controllerId?: string | undefined;

  constructor(message: string, controllerId?: string, cause?: Error) {
    super(message, 'CF-HTTP-CONTROLLER-CANCELLATION', cause);
    this.name = 'HttpControllerCancellationError';
    this.controllerId = controllerId;
  }
}

export class HttpControllerTimeoutError extends HttpControllerError {
  public readonly controllerId?: string | undefined;
  public readonly timeoutMs?: number | undefined;

  constructor(message: string, controllerId?: string, timeoutMs?: number, cause?: Error) {
    super(message, 'CF-HTTP-CONTROLLER-TIMEOUT', cause);
    this.name = 'HttpControllerTimeoutError';
    this.controllerId = controllerId;
    this.timeoutMs = timeoutMs;
  }
}

export class HttpEndpointError extends HttpControllerError {
  public readonly endpointId?: string | undefined;

  constructor(message: string, code = 'CF-HTTP-ENDPOINT', endpointId?: string, cause?: Error) {
    super(message, code, cause);
    this.name = 'HttpEndpointError';
    this.endpointId = endpointId;
  }
}

export class HttpEndpointDuplicateError extends HttpEndpointError {
  constructor(endpointId: string, message?: string, cause?: Error) {
    super(
      message ?? `HTTP endpoint with ID '${endpointId}' is already registered`,
      'CF-HTTP-ENDPOINT-DUPLICATE',
      endpointId,
      cause,
    );
    this.name = 'HttpEndpointDuplicateError';
  }
}

export class HttpEndpointValidationError extends HttpEndpointError {
  constructor(message: string, endpointId?: string, cause?: Error) {
    super(message, 'CF-HTTP-ENDPOINT-VALIDATION', endpointId, cause);
    this.name = 'HttpEndpointValidationError';
  }
}

export class HttpEndpointNotFoundError extends HttpEndpointError {
  constructor(identifier: string, cause?: Error) {
    super(
      `HTTP endpoint not found for '${identifier}'`,
      'CF-HTTP-ENDPOINT-NOT-FOUND',
      undefined,
      cause,
    );
    this.name = 'HttpEndpointNotFoundError';
  }
}

export class HttpEndpointRegistrationError extends HttpEndpointError {
  constructor(message: string, endpointId?: string, cause?: Error) {
    super(message, 'CF-HTTP-ENDPOINT-REGISTRATION', endpointId, cause);
    this.name = 'HttpEndpointRegistrationError';
  }
}
