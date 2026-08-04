import { CoreForgeError } from '@coreforge/errors';

export class BootstrapInitializationError extends CoreForgeError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CF-BOOTSTRAP_INITIALIZATION_ERROR', cause);
  }
}

export class BootstrapValidationError extends CoreForgeError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CF-BOOTSTRAP_VALIDATION_ERROR', cause);
  }
}

export class BootstrapTimeoutError extends CoreForgeError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CF-BOOTSTRAP_TIMEOUT_ERROR', cause);
  }
}
