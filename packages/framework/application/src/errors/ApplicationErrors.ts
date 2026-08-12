import { CoreForgeError } from '@coreforge/errors';

export class ApplicationInitializationError extends CoreForgeError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CF-APPLICATION_INITIALIZATION_ERROR', cause);
  }
}

export class ApplicationStateError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CF-APPLICATION_STATE_ERROR', details);
  }
}

export class ApplicationValidationError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CF-APPLICATION_VALIDATION_ERROR', details);
  }
}

export class ApplicationShutdownError extends CoreForgeError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CF-APPLICATION_SHUTDOWN_ERROR', cause);
  }
}
