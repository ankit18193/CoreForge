import { CoreForgeError } from '@coreforge/errors';

export class CompilationValidationError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CF-COMPILATION_VALIDATION_ERROR', details);
  }
}

export class CompilationOptimizationError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CF-COMPILATION_OPTIMIZATION_ERROR', details);
  }
}

export class CompilationStateError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CF-COMPILATION_STATE_ERROR', details);
  }
}

export class CompilationModelError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CF-COMPILATION_MODEL_ERROR', details);
  }
}
