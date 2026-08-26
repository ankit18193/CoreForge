import { CoreForgeError } from '@coreforge/errors';

export class ErrorHandlingError extends CoreForgeError {
  constructor(message: string, code = 'CF-ERROR-HANDLING', details?: unknown) {
    super(message, code, details);
  }
}

export class ErrorHandlingConfigurationError extends ErrorHandlingError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-ERROR-HANDLING-CONFIGURATION', details);
  }
}

export class ErrorHandlingStateError extends ErrorHandlingError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-ERROR-HANDLING-STATE', details);
  }
}

export class ErrorClassificationError extends ErrorHandlingError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-ERROR-CLASSIFICATION', details);
  }
}

export class ErrorNormalizationError extends ErrorHandlingError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-ERROR-NORMALIZATION', details);
  }
}

export class ErrorSanitizationError extends ErrorHandlingError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-ERROR-SANITIZATION', details);
  }
}

export class ErrorHandlerRegistrationError extends ErrorHandlingError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-ERROR-HANDLER-REGISTRATION', details);
  }
}

export class ErrorHandlerResolutionError extends ErrorHandlingError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-ERROR-HANDLER-RESOLUTION', details);
  }
}

export class ErrorHandlerExecutionError extends ErrorHandlingError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-ERROR-HANDLER-EXECUTION', details);
  }
}

export class ErrorHandlerRecursionError extends ErrorHandlingError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-ERROR-HANDLER-RECURSION', details);
  }
}

export class ErrorProcessingError extends ErrorHandlingError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-ERROR-PROCESSING', details);
  }
}

export class ErrorHandlingLimitError extends ErrorHandlingError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-ERROR-HANDLING-LIMIT', details);
  }
}
