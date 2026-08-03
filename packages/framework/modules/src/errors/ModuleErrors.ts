import { CoreForgeError } from '@coreforge/errors';

export class ModuleAlreadyRegisteredError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'MODULE_ALREADY_REGISTERED', details);
  }
}

export class ModuleDependencyError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'MODULE_DEPENDENCY_ERROR', details);
  }
}

export class CircularModuleDependencyError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CIRCULAR_MODULE_DEPENDENCY', details);
  }
}

export class ModuleLifecycleError extends CoreForgeError {
  public readonly cause?: Error | undefined;

  constructor(message: string, cause?: Error, details?: Record<string, unknown>) {
    super(message, 'MODULE_LIFECYCLE_ERROR', details);
    this.cause = cause;
  }
}

export class ModuleStateTransitionError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'MODULE_STATE_TRANSITION_ERROR', details);
  }
}
