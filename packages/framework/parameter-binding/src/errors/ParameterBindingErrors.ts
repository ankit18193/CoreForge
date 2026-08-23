import { CoreForgeError } from '@coreforge/errors';

export class ParameterBindingError extends CoreForgeError {
  constructor(message: string, code = 'CF-BINDING-ERROR', details?: unknown) {
    super(message, code, details);
  }
}

export class ParameterBindingValidationError extends ParameterBindingError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-BINDING-VALIDATION_ERROR', details);
  }
}

export class ParameterBindingNotFoundError extends ParameterBindingError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-BINDING-NOT_FOUND', details);
  }
}

export class ParameterBindingConflictError extends ParameterBindingError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-BINDING-CONFLICT', details);
  }
}

export class ParameterBindingSourceError extends ParameterBindingError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-BINDING-SOURCE_ERROR', details);
  }
}

export class ParameterBindingStateError extends ParameterBindingError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-BINDING-STATE_ERROR', details);
  }
}
