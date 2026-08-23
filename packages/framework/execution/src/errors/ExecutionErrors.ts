import { CoreForgeError } from '@coreforge/errors';

export class ExecutionError extends CoreForgeError {
  constructor(message: string, code = 'CF-EXECUTION-ERROR', details?: unknown) {
    super(message, code, details);
  }
}

export class ExecutionStateError extends ExecutionError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-EXECUTION-STATE-ERROR', details);
  }
}

export class ActionNotFoundError extends ExecutionError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-EXECUTION-ACTION-NOT-FOUND', details);
  }
}

export class ControllerResolutionError extends ExecutionError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-EXECUTION-CONTROLLER-RESOLUTION-ERROR', details);
  }
}

export class ActionInvocationError extends ExecutionError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-EXECUTION-ACTION-INVOCATION-ERROR', details);
  }
}

export class GuardRejectedError extends ExecutionError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-EXECUTION-GUARD-REJECTED', details);
  }
}

export class MiddlewareExecutionError extends ExecutionError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-EXECUTION-MIDDLEWARE-ERROR', details);
  }
}

export class InterceptorExecutionError extends ExecutionError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-EXECUTION-INTERCEPTOR-ERROR', details);
  }
}

export class PipelineExecutionError extends ExecutionError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-EXECUTION-PIPELINE-ERROR', details);
  }
}
