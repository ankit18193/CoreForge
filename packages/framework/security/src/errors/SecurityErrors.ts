import { CoreForgeError } from '@coreforge/errors';

export class SecurityLifecycleError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CF-SECURITY_LIFECYCLE_ERROR', details);
  }
}

export class AuthenticationError extends CoreForgeError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CF-AUTHENTICATION_ERROR', cause);
  }
}

export class ForbiddenError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CF-FORBIDDEN_ERROR', details);
  }
}

export class SecurityExecutionError extends CoreForgeError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CF-SECURITY_EXECUTION_ERROR', cause);
  }
}

export class SecurityConfigurationError extends CoreForgeError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CF-SECURITY_CONFIGURATION_ERROR', cause);
  }
}
