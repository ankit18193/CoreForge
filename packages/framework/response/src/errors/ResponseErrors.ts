import { CoreForgeError } from '@coreforge/errors';

export class ResponseError extends CoreForgeError {
  constructor(message: string, code = 'CF-RESPONSE-ERROR', details?: unknown) {
    super(message, code, details);
  }
}

export class ResponseStateError extends ResponseError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-RESPONSE-STATE-ERROR', details);
  }
}

export class ResponseProcessingError extends ResponseError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-RESPONSE-PROCESSING-ERROR', details);
  }
}

export class ResponseSerializationError extends ResponseError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-RESPONSE-SERIALIZATION-ERROR', details);
  }
}

export class CircularResponseError extends ResponseSerializationError {
  public readonly circularPath: string;

  constructor(circularPath: string, details?: unknown) {
    super(`Circular reference detected in response payload at path: ${circularPath}`, {
      circularPath,
      ...(typeof details === 'object' && details !== null ? details : {}),
    });
    this.circularPath = circularPath;
  }
}

export class InvalidResponseStatusError extends ResponseError {
  constructor(status: unknown, details?: unknown) {
    super(
      `Invalid HTTP response status "${String(status)}". Status must be an integer between 100 and 599.`,
      'CF-RESPONSE-INVALID-STATUS',
      { status, ...(typeof details === 'object' && details !== null ? details : {}) },
    );
  }
}

export class InvalidResponseHeaderError extends ResponseError {
  constructor(headerName: unknown, reason: string, details?: unknown) {
    super(
      `Invalid response header "${String(headerName)}": ${reason}`,
      'CF-RESPONSE-INVALID-HEADER',
      { headerName, reason, ...(typeof details === 'object' && details !== null ? details : {}) },
    );
  }
}

export class UnsupportedResponseValueError extends ResponseError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-RESPONSE-UNSUPPORTED-VALUE', details);
  }
}
