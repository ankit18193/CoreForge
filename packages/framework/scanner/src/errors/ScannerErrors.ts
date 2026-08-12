import { CoreForgeError } from '@coreforge/errors';

export class ScannerValidationError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CF-SCANNER_VALIDATION_ERROR', details);
  }
}

export class ScannerStateError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CF-SCANNER_STATE_ERROR', details);
  }
}

export class RegistrationConflictError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CF-REGISTRATION_CONFLICT_ERROR', details);
  }
}

export class RegistrationOrderingError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CF-REGISTRATION_ORDERING_ERROR', details);
  }
}
