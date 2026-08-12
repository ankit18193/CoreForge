import { CoreForgeError } from '@coreforge/errors';

export class SerializationLifecycleError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CF-SERIALIZATION_LIFECYCLE_ERROR', details);
  }
}

export class UnsupportedMediaTypeError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CF-UNSUPPORTED_MEDIA_TYPE_ERROR', details);
  }
}

export class SerializationExecutionError extends CoreForgeError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CF-SERIALIZATION_EXECUTION_ERROR', cause);
  }
}

export class SerializationConfigurationError extends CoreForgeError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CF-SERIALIZATION_CONFIGURATION_ERROR', cause);
  }
}
