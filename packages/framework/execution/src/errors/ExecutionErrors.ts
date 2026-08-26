import { CoreForgeError } from '@coreforge/errors';

export class ExecutionEngineError extends CoreForgeError {
  constructor(message: string, code = 'CF-EXECUTION-ERROR', details?: unknown) {
    super(message, code, details);
  }
}

export class ExecutionConfigurationError extends ExecutionEngineError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-EXECUTION-CONFIGURATION', details);
  }
}

export class ExecutionEngineStateError extends ExecutionEngineError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-EXECUTION-STATE', details);
  }
}

export class ExecutionMiddlewareError extends ExecutionEngineError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-EXECUTION-MIDDLEWARE', details);
  }
}

export class ExecutionMiddlewareRegistrationError extends ExecutionEngineError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-EXECUTION-MIDDLEWARE-REGISTRATION', details);
  }
}

export class ExecutionHandlerError extends ExecutionEngineError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-EXECUTION-HANDLER', details);
  }
}

export class ExecutionExecutionError extends ExecutionEngineError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-EXECUTION-EXECUTION', details);
  }
}

export class ExecutionCancellationError extends ExecutionEngineError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-EXECUTION-CANCELLATION', details);
  }
}

export class ExecutionShortCircuitError extends ExecutionEngineError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-EXECUTION-SHORT-CIRCUIT', details);
  }
}

export class ExecutionResultError extends ExecutionEngineError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-EXECUTION-RESULT', details);
  }
}

export class ExecutionConcurrencyError extends ExecutionEngineError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-EXECUTION-CONCURRENCY', details);
  }
}

export class GuardRejectedError extends ExecutionEngineError {
  constructor(message = 'Guard rejected the request', details?: unknown) {
    super(message, 'CF-EXECUTION-GUARD-REJECTED', details);
  }
}

export class MiddlewareExecutionError extends ExecutionEngineError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-EXECUTION-MIDDLEWARE-FAILURE', details);
  }
}

export class InterceptorExecutionError extends ExecutionEngineError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-EXECUTION-INTERCEPTOR-FAILURE', details);
  }
}
