import { CoreForgeError } from '@coreforge/errors';

export class ActionInvokerLifecycleError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CF-ACTION_INVOKER_LIFECYCLE_ERROR', details);
  }
}

export class ControllerResolutionError extends CoreForgeError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CF-CONTROLLER_RESOLUTION_ERROR', cause);
  }
}

export class ActionNotFoundError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CF-ACTION_NOT_FOUND_ERROR', details);
  }
}

export class ActionInvocationExecutionError extends CoreForgeError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CF-ACTION_INVOCATION_EXECUTION_ERROR', cause);
  }
}

export class ActionInvokerConfigurationError extends CoreForgeError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CF-ACTION_INVOKER_CONFIGURATION_ERROR', cause);
  }
}
