import { CoreForgeError } from '@coreforge/errors';

export class IntegrationError extends CoreForgeError {
  constructor(message: string, code = 'CF-INTEGRATION', details?: unknown) {
    super(message, code, details);
  }
}

export class IntegrationConfigurationError extends IntegrationError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-INTEGRATION-CONFIGURATION', details);
  }
}

export class IntegrationWiringError extends IntegrationError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-INTEGRATION-WIRING', details);
  }
}

export class IntegrationStateError extends IntegrationError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-INTEGRATION-STATE', details);
  }
}

export class IntegrationLifecycleError extends IntegrationError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-INTEGRATION-LIFECYCLE', details);
  }
}

export class IntegrationExecutionError extends IntegrationError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-INTEGRATION-EXECUTION', details);
  }
}

export class IntegrationDependencyError extends IntegrationError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-INTEGRATION-DEPENDENCY', details);
  }
}

export class IntegrationTimeoutError extends IntegrationError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-INTEGRATION-TIMEOUT', details);
  }
}
