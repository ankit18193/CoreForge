import { CoreForgeError } from '@coreforge/errors';

export class BindingExecutionError extends CoreForgeError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CF-BINDING_EXECUTION_ERROR', cause);
  }
}

export class BindingConfigurationError extends CoreForgeError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CF-BINDING_CONFIGURATION_ERROR', cause);
  }
}

export class ConversionError extends CoreForgeError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CF-CONVERSION_ERROR', cause);
  }
}

export class ValidationException extends CoreForgeError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}
