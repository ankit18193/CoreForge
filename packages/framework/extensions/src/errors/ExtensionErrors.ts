import { CoreForgeError } from '@coreforge/errors';

export class ExtensionValidationError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CF-EXTENSION_VALIDATION_ERROR', details);
  }
}

export class ExtensionStateError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CF-EXTENSION_STATE_ERROR', details);
  }
}

export class ExtensionLoadError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CF-EXTENSION_LOAD_ERROR', details);
  }
}
