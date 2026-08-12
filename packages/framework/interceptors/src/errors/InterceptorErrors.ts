import { CoreForgeError } from '@coreforge/errors';

export class InterceptorLifecycleError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CF-INTERCEPTOR_LIFECYCLE_ERROR', details);
  }
}

export class InterceptorExecutionError extends CoreForgeError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CF-INTERCEPTOR_EXECUTION_ERROR', cause);
  }
}

export class InterceptorConfigurationError extends CoreForgeError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CF-INTERCEPTOR_CONFIGURATION_ERROR', cause);
  }
}
