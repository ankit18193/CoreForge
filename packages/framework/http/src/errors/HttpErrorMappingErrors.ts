import { HttpError } from './HttpErrors';

export class HttpErrorMappingError extends HttpError {
  constructor(message: string, code = 'CF-HTTP-ERROR-MAPPING', details?: unknown) {
    super(message, code, details);
    this.name = 'HttpErrorMappingError';
  }
}

export class HttpErrorMappingConfigurationError extends HttpErrorMappingError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-HTTP-ERROR-MAPPING-CONFIG', details);
    this.name = 'HttpErrorMappingConfigurationError';
  }
}

export class HttpErrorMapperRegistrationError extends HttpErrorMappingError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-HTTP-ERROR-MAPPING-REGISTRATION', details);
    this.name = 'HttpErrorMapperRegistrationError';
  }
}

export class HttpErrorMapperDuplicateError extends HttpErrorMappingError {
  public readonly mapperId: string;

  constructor(mapperId: string, details?: unknown) {
    super(
      `HttpErrorMapper with ID "${mapperId}" is already registered.`,
      'CF-HTTP-ERROR-MAPPING-DUPLICATE',
      details,
    );
    this.name = 'HttpErrorMapperDuplicateError';
    this.mapperId = mapperId;
  }
}

export class HttpErrorMapperNotFoundError extends HttpErrorMappingError {
  public readonly target: string;

  constructor(target: string, details?: unknown) {
    super(
      `No suitable HttpErrorMapper found for target "${target}".`,
      'CF-HTTP-ERROR-MAPPING-NOT-FOUND',
      details,
    );
    this.name = 'HttpErrorMapperNotFoundError';
    this.target = target;
  }
}

export class HttpErrorMappingExecutionError extends HttpErrorMappingError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-HTTP-ERROR-MAPPING-EXECUTION', details);
    this.name = 'HttpErrorMappingExecutionError';
  }
}

export class HttpErrorMappingValidationError extends HttpErrorMappingError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-HTTP-ERROR-MAPPING-VALIDATION', details);
    this.name = 'HttpErrorMappingValidationError';
  }
}
