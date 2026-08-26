import { CoreForgeError } from '@coreforge/errors';

export class DispatchError extends CoreForgeError {
  constructor(message: string, code = 'CF-DISPATCH-ERROR', details?: unknown) {
    super(message, code, details);
  }
}

export class DispatchConfigurationError extends DispatchError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-DISPATCH-CONFIGURATION', details);
  }
}

export class DispatchStateError extends DispatchError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-DISPATCH-STATE', details);
  }
}

export class CommandValidationError extends DispatchError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-DISPATCH-COMMAND', details);
  }
}

export class HandlerRegistrationError extends DispatchError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-DISPATCH-HANDLER-REGISTRATION', details);
  }
}

export class HandlerNotFoundError extends DispatchError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-DISPATCH-HANDLER-NOT-FOUND', details);
  }
}

export class HandlerExecutionError extends DispatchError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-DISPATCH-HANDLER-EXECUTION', details);
  }
}

export class DispatchCancellationError extends DispatchError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-DISPATCH-CANCELLATION', details);
  }
}

export class DispatchLifecycleError extends DispatchError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-DISPATCH-LIFECYCLE', details);
  }
}

export class DispatchConcurrencyError extends DispatchError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-DISPATCH-CONCURRENCY', details);
  }
}

export class DispatchResultError extends DispatchError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-DISPATCH-RESULT', details);
  }
}
