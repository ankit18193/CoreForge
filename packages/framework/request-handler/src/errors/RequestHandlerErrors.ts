import { CoreForgeError } from '@coreforge/errors';

export class RequestExecutionError extends CoreForgeError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CF-REQUEST_EXECUTION_ERROR', cause);
  }
}

export class RequestHandlerConfigurationError extends CoreForgeError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CF-REQUEST_HANDLER_CONFIGURATION_ERROR', cause);
  }
}
