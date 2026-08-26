import { CoreForgeError } from '@coreforge/errors';

export class InterceptorError extends CoreForgeError {
  constructor(message: string, code = 'CF-INTERCEPTOR-ERROR', details?: unknown) {
    super(message, code, details);
  }
}

export class InterceptorConfigurationError extends InterceptorError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-INTERCEPTOR-CONFIGURATION', details);
  }
}

export class InterceptorStateError extends InterceptorError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-INTERCEPTOR-STATE', details);
  }
}

export class InterceptorRegistrationError extends InterceptorError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-INTERCEPTOR-REGISTRATION', details);
  }
}

export class InterceptorExecutionError extends InterceptorError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-INTERCEPTOR-EXECUTION', details);
  }
}

export class InterceptorContinuationError extends InterceptorError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-INTERCEPTOR-CONTINUATION', details);
  }
}

export class InterceptorShortCircuitError extends InterceptorError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-INTERCEPTOR-SHORT-CIRCUIT', details);
  }
}

export class InterceptorLifecycleError extends InterceptorError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-INTERCEPTOR-LIFECYCLE', details);
  }
}

export class InterceptorConcurrencyError extends InterceptorError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-INTERCEPTOR-CONCURRENCY', details);
  }
}
