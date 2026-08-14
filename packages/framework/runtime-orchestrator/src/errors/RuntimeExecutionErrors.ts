import { CoreForgeError } from '@coreforge/errors';

export class RuntimeExecutionError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CF-RUNTIME_EXECUTION_ERROR', details);
  }
}

export class RuntimeExecutionStateError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CF-RUNTIME_EXECUTION_STATE_ERROR', details);
  }
}

export class RuntimeStartupError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CF-RUNTIME_STARTUP_ERROR', details);
  }
}

export class RuntimeShutdownError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CF-RUNTIME_SHUTDOWN_ERROR', details);
  }
}
