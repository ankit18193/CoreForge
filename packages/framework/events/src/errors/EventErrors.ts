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

export class EventRegistrationError extends EventError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-EVENT-REGISTRATION', details);
  }
}

export class EventSubscriptionError extends EventError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-EVENT-SUBSCRIPTION', details);
  }
}

export class EventDispatchError extends EventError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-EVENT-DISPATCH', details);
  }
}

export class EventHandlerError extends EventError {
  public readonly handlerId: string;

  constructor(handlerId: string, message: string, cause?: unknown) {
    super(`Event handler '${handlerId}' failed: ${message}`, 'CF-EVENT-HANDLER', {
      handlerId,
      cause: cause instanceof Error ? cause.message : cause,
    });
    this.handlerId = handlerId;
  }
}

export class EventCancelledError extends EventError {
  constructor(message = 'Event dispatch was cancelled by AbortSignal.', details?: unknown) {
    super(message, 'CF-EVENT-CANCELLED', details);
  }
}

export class EventRetryExhaustedError extends EventError {
  public readonly handlerId: string;
  public readonly attempts: number;

  constructor(handlerId: string, attempts: number, cause?: unknown) {
    super(
      `Event handler '${handlerId}' exhausted all ${attempts} retry attempts.`,
      'CF-EVENT-RETRY-EXHAUSTED',
      { handlerId, attempts, cause: cause instanceof Error ? cause.message : cause },
    );
    this.handlerId = handlerId;
    this.attempts = attempts;
  }
}

export class EventPayloadError extends EventError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-EVENT-PAYLOAD', details);
  }
}
