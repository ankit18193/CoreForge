import { CoreForgeError } from '@coreforge/errors';

export class EventHandlerError extends CoreForgeError {
  public readonly cause?: Error | undefined;

  constructor(message: string, cause?: Error, details?: Record<string, unknown>) {
    super(message, 'EVENT_HANDLER_ERROR', details);
    this.cause = cause;
  }
}

export class EventRegistrationError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'EVENT_REGISTRATION_ERROR', details);
  }
}

export class UnknownEventError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'UNKNOWN_EVENT_ERROR', details);
  }
}
