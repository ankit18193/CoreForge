import { CoreForgeError } from '@coreforge/errors';

export class DecoratorError extends CoreForgeError {
  constructor(message: string, code = 'CF-DECORATOR_ERROR', details?: unknown) {
    super(message, code, details);
  }
}

export class DecoratorValidationError extends DecoratorError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-DECORATOR_VALIDATION_ERROR', details);
  }
}

export class DecoratorConflictError extends DecoratorError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-DECORATOR_CONFLICT_ERROR', details);
  }
}

export class DecoratorStateError extends DecoratorError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-DECORATOR_STATE_ERROR', details);
  }
}

export class DecoratorTargetError extends DecoratorError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-DECORATOR_TARGET_ERROR', details);
  }
}
