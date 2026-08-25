import { CoreForgeError } from '@coreforge/errors';

export class ExecutionContextError extends CoreForgeError {
  constructor(message: string, code = 'CF-EXECUTION-CONTEXT-ERROR', details?: unknown) {
    super(message, code, details);
  }
}

export class ExecutionContextConfigurationError extends ExecutionContextError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-EXECUTION-CONTEXT-CONFIGURATION', details);
  }
}

export class ExecutionContextStateError extends ExecutionContextError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-EXECUTION-CONTEXT-STATE', details);
  }
}

export class ExecutionIdError extends ExecutionContextError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-EXECUTION-CONTEXT-ID', details);
  }
}

export class ExecutionMetadataError extends ExecutionContextError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-EXECUTION-CONTEXT-METADATA', details);
  }
}

export class ExecutionCancellationError extends ExecutionContextError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-EXECUTION-CONTEXT-CANCELLATION', details);
  }
}

export class ExecutionLimitError extends ExecutionContextError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-EXECUTION-CONTEXT-LIMIT', details);
  }
}
