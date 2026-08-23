import { CoreForgeError } from '@coreforge/errors';

export class ExceptionError extends CoreForgeError {
  constructor(message: string, code = 'CF-EXCEPTION-ERROR', details?: unknown) {
    super(message, code, details);
  }
}

export class ExceptionStateError extends ExceptionError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-EXCEPTION-STATE-ERROR', details);
  }
}

export class ExceptionPipelineError extends ExceptionError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-EXCEPTION-PIPELINE-ERROR', details);
  }
}

export class HandlerExecutionError extends ExceptionError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-EXCEPTION-HANDLER-ERROR', details);
  }
}

export class InvalidErrorDescriptorError extends ExceptionError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-EXCEPTION-INVALID-DESCRIPTOR', details);
  }
}
