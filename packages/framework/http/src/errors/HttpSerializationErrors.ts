import { HttpError } from './HttpErrors';

export class HttpSerializationError extends HttpError {
  constructor(message: string, code = 'CF-HTTP-SERIALIZATION', cause?: Error) {
    super(message, code, cause);
    this.name = 'HttpSerializationError';
  }
}

export class HttpSerializationConfigurationError extends HttpSerializationError {
  constructor(message: string, cause?: Error) {
    super(message, 'CF-HTTP-SERIALIZATION-CONFIG', cause);
    this.name = 'HttpSerializationConfigurationError';
  }
}

export class HttpSerializerValidationError extends HttpSerializationError {
  constructor(message: string, cause?: Error) {
    super(message, 'CF-HTTP-SERIALIZER-VALIDATION', cause);
    this.name = 'HttpSerializerValidationError';
  }
}

export class HttpSerializerRegistrationError extends HttpSerializationError {
  constructor(message: string, cause?: Error) {
    super(message, 'CF-HTTP-SERIALIZER-REGISTRATION', cause);
    this.name = 'HttpSerializerRegistrationError';
  }
}

export class HttpSerializerDuplicateError extends HttpSerializationError {
  public readonly serializerId: string;

  constructor(serializerId: string, message?: string, cause?: Error) {
    super(
      message ?? `Serializer with id '${serializerId}' is already registered`,
      'CF-HTTP-SERIALIZER-DUPLICATE',
      cause,
    );
    this.name = 'HttpSerializerDuplicateError';
    this.serializerId = serializerId;
  }
}

export class HttpSerializerNotFoundError extends HttpSerializationError {
  public readonly identifier: string;

  constructor(identifier: string, message?: string, cause?: Error) {
    super(
      message ?? `No serializer found matching '${identifier}'`,
      'CF-HTTP-SERIALIZER-NOT-FOUND',
      cause,
    );
    this.name = 'HttpSerializerNotFoundError';
    this.identifier = identifier;
  }
}

export class HttpSerializationExecutionError extends HttpSerializationError {
  public readonly serializerId?: string | undefined;

  constructor(message: string, serializerId?: string, cause?: Error) {
    super(message, 'CF-HTTP-SERIALIZATION-EXECUTION', cause);
    this.name = 'HttpSerializationExecutionError';
    this.serializerId = serializerId;
  }
}

export class HttpSerializationTimeoutError extends HttpSerializationError {
  public readonly timeoutMs: number;
  public readonly serializerId?: string | undefined;

  constructor(timeoutMs: number, serializerId?: string, message?: string, cause?: Error) {
    super(
      message ??
        `Serialization${serializerId ? ` by '${serializerId}'` : ''} timed out after ${timeoutMs}ms`,
      'CF-HTTP-SERIALIZATION-TIMEOUT',
      cause,
    );
    this.name = 'HttpSerializationTimeoutError';
    this.timeoutMs = timeoutMs;
    this.serializerId = serializerId;
  }
}

export class HttpSerializationCancellationError extends HttpSerializationError {
  constructor(message = 'Serialization was cancelled', cause?: Error) {
    super(message, 'CF-HTTP-SERIALIZATION-CANCELLED', cause);
    this.name = 'HttpSerializationCancellationError';
  }
}

export class HttpResponseTransformationError extends HttpSerializationError {
  public readonly transformerId?: string | undefined;

  constructor(message: string, transformerId?: string, cause?: Error) {
    super(message, 'CF-HTTP-RESPONSE-TRANSFORMATION', cause);
    this.name = 'HttpResponseTransformationError';
    this.transformerId = transformerId;
  }
}
