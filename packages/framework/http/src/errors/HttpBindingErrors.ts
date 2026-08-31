import { HttpError } from './HttpErrors';
import type { HttpBindingSource } from '../types/httpBindingTypes';

export class HttpBindingError extends HttpError {
  constructor(message: string, code = 'CF-HTTP-BINDING', cause?: Error) {
    super(message, code, cause);
    this.name = 'HttpBindingError';
  }
}

export class HttpBindingConfigurationError extends HttpBindingError {
  constructor(message: string, cause?: Error) {
    super(message, 'CF-HTTP-BINDING-CONFIG', cause);
    this.name = 'HttpBindingConfigurationError';
  }
}

export class HttpBindingDefinitionError extends HttpBindingError {
  public readonly field?: string | undefined;
  public readonly source?: HttpBindingSource | undefined;

  constructor(message: string, field?: string, source?: HttpBindingSource, cause?: Error) {
    super(message, 'CF-HTTP-BINDING-DEFINITION', cause);
    this.name = 'HttpBindingDefinitionError';
    this.field = field;
    this.source = source;
  }
}

export class HttpBindingValidationError extends HttpBindingError {
  public readonly errors: readonly import('@coreforge/contracts').HttpValidationErrorDetail[];

  constructor(
    message: string,
    errors: readonly import('@coreforge/contracts').HttpValidationErrorDetail[] = [],
    cause?: Error,
  ) {
    super(message, 'CF-HTTP-BINDING-VALIDATION', cause);
    this.name = 'HttpBindingValidationError';
    this.errors = Object.freeze([...errors]);
  }
}

export class HttpBindingMissingFieldError extends HttpBindingError {
  public readonly field: string;
  public readonly source?: HttpBindingSource | undefined;

  constructor(field: string, source?: HttpBindingSource, message?: string, cause?: Error) {
    super(
      message ?? `Required field '${field}' is missing from ${source ?? 'request'}`,
      'CF-HTTP-BINDING-MISSING-FIELD',
      cause,
    );
    this.name = 'HttpBindingMissingFieldError';
    this.field = field;
    this.source = source;
  }
}

export class HttpBindingTypeError extends HttpBindingError {
  public readonly field: string;
  public readonly expectedType: string;
  public readonly receivedType?: string | undefined;

  constructor(
    field: string,
    expectedType: string,
    receivedType?: string,
    message?: string,
    cause?: Error,
  ) {
    super(
      message ??
        `Field '${field}' expected type '${expectedType}' but received '${receivedType ?? 'unknown'}'`,
      'CF-HTTP-BINDING-TYPE',
      cause,
    );
    this.name = 'HttpBindingTypeError';
    this.field = field;
    this.expectedType = expectedType;
    this.receivedType = receivedType;
  }
}

export class HttpBindingTransformationError extends HttpBindingError {
  public readonly field: string;
  public readonly targetType: string;

  constructor(field: string, targetType: string, message?: string, cause?: Error) {
    super(
      message ?? `Failed to transform field '${field}' to target type '${targetType}'`,
      'CF-HTTP-BINDING-TRANSFORMATION',
      cause,
    );
    this.name = 'HttpBindingTransformationError';
    this.field = field;
    this.targetType = targetType;
  }
}

export class HttpBindingExecutionError extends HttpBindingError {
  public readonly binderId?: string | undefined;

  constructor(message: string, binderId?: string, cause?: Error) {
    super(message, 'CF-HTTP-BINDING-EXECUTION', cause);
    this.name = 'HttpBindingExecutionError';
    this.binderId = binderId;
  }
}
