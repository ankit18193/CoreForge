import { CoreForgeError } from '@coreforge/errors';

export class TransportError extends CoreForgeError {
  constructor(message: string, code = 'CF-TRANSPORT', details?: unknown) {
    super(message, code, details);
  }
}

export class TransportConfigurationError extends TransportError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-TRANSPORT-CONFIGURATION', details);
  }
}

export class TransportRegistrationError extends TransportError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-TRANSPORT-REGISTRATION', details);
  }
}

export class TransportAdapterNotFoundError extends TransportError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-TRANSPORT-ADAPTER-NOT-FOUND', details);
  }
}

export class TransportStateError extends TransportError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-TRANSPORT-STATE', details);
  }
}

export class TransportValidationError extends TransportError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-TRANSPORT-VALIDATION', details);
  }
}

export class TransportExecutionError extends TransportError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-TRANSPORT-EXECUTION', details);
  }
}

export class TransportCancellationError extends TransportError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-TRANSPORT-CANCELLATION', details);
  }
}

export class TransportTimeoutError extends TransportError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-TRANSPORT-TIMEOUT', details);
  }
}
