import { CoreForgeError } from '@coreforge/errors';

export class ApplicationError extends CoreForgeError {
  constructor(message: string, code = 'CF-APP-ERROR', details?: unknown) {
    super(message, code, details);
  }
}

export class ApplicationConfigurationError extends ApplicationError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-APP-CONFIGURATION', details);
  }
}

export class ApplicationStateError extends ApplicationError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-APP-STATE', details);
  }
}

export class ApplicationValidationError extends ApplicationError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-APP-VALIDATION', details);
  }
}

export class ApplicationRegistrationError extends ApplicationError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-APP-REGISTRATION', details);
  }
}

export class ApplicationServiceNotFoundError extends ApplicationError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-APP-SERVICE-NOT-FOUND', details);
  }
}

export class ApplicationExecutionError extends ApplicationError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-APP-EXECUTION', details);
  }
}

export class ApplicationCancellationError extends ApplicationError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-APP-CANCELLATION', details);
  }
}

export class ApplicationConcurrencyError extends ApplicationError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-APP-CONCURRENCY', details);
  }
}

export class ApplicationSnapshotError extends ApplicationError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-APP-SNAPSHOT', details);
  }
}

export class ApplicationOrchestrationError extends ApplicationError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-APP-ORCHESTRATION', details);
  }
}
