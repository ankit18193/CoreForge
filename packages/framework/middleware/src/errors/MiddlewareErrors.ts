import { CoreForgeError } from '@coreforge/errors';

export class MiddlewareExecutionError extends CoreForgeError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CF-MIDDLEWARE_EXECUTION_ERROR', cause);
  }
}

export class MiddlewareRegistrationError extends CoreForgeError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CF-MIDDLEWARE_REGISTRATION_ERROR', cause);
  }
}
