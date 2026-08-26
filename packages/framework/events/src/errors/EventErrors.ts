import { CoreForgeError } from '@coreforge/errors';

export class EventError extends CoreForgeError {
  constructor(message: string, code = 'CF-EVENT-ERROR', details?: unknown) {
    super(message, code, details);
  }
}

export class EventConfigurationError extends EventError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-EVENT-CONFIGURATION', details);
  }
}

export class EventStateError extends EventError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-EVENT-STATE', details);
  }
}

export class EventValidationError extends EventError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-EVENT-VALIDATION', details);
  }
}

export class EventTypeError extends EventError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-EVENT-TYPE', details);
  }
}

export class EventHandlerRegistrationError extends EventError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-EVENT-HANDLER-REGISTRATION', details);
  }
}

export class EventHandlerNotFoundError extends EventError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-EVENT-HANDLER-NOT-FOUND', details);
  }
}

export class EventExecutionError extends EventError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-EVENT-EXECUTION', details);
  }
}

export class EventCancellationError extends EventError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-EVENT-CANCELLATION', details);
  }
}

export class EventSnapshotError extends EventError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-EVENT-SNAPSHOT', details);
  }
}

export class EventConcurrencyError extends EventError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-EVENT-CONCURRENCY', details);
  }
}

export class EventLifecycleError extends EventError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-EVENT-LIFECYCLE', details);
  }
}
