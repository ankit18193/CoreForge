import { CoreForgeError } from '@coreforge/errors';

export class ScopeLifecycleError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CF-SCOPE_LIFECYCLE_ERROR', details);
  }
}

export class ScopeExecutionError extends CoreForgeError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CF-SCOPE_EXECUTION_ERROR', cause);
  }
}

export class ScopeConfigurationError extends CoreForgeError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CF-SCOPE_CONFIGURATION_ERROR', cause);
  }
}

export class DisposalTimeoutError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CF-DISPOSAL_TIMEOUT_ERROR', details);
  }
}
