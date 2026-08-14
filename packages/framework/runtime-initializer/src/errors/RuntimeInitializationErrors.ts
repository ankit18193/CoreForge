import { CoreForgeError } from '@coreforge/errors';

export class RuntimeInitializationError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CF-RUNTIME_INITIALIZATION_ERROR', details);
  }
}

export class RuntimeInitializationStateError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CF-RUNTIME_INITIALIZATION_STATE_ERROR', details);
  }
}

export class RuntimeInitializationValidationError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CF-RUNTIME_INITIALIZATION_VALIDATION_ERROR', details);
  }
}

export class RuntimeRollbackError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CF-RUNTIME_ROLLBACK_ERROR', details);
  }
}
