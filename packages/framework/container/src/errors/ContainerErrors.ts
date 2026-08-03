import { CoreForgeError } from '@coreforge/errors';

export class ServiceNotFoundError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'SERVICE_NOT_FOUND', details);
  }
}

export class DuplicateRegistrationError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'DUPLICATE_REGISTRATION', details);
  }
}

export class CircularDependencyError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CIRCULAR_DEPENDENCY', details);
  }
}

export class InvalidRegistrationError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'INVALID_REGISTRATION', details);
  }
}
