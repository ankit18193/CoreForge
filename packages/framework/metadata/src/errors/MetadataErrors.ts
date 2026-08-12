import { CoreForgeError } from '@coreforge/errors';

export class MetadataRegistrationError extends CoreForgeError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CF-METADATA_REGISTRATION_ERROR', cause);
  }
}

export class MetadataDuplicateError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CF-METADATA_DUPLICATE_ERROR', details);
  }
}

export class MetadataStateError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CF-METADATA_STATE_ERROR', details);
  }
}

export class MetadataResolutionError extends CoreForgeError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CF-METADATA_RESOLUTION_ERROR', cause);
  }
}
