import { CoreForgeError } from '@coreforge/errors';

export class HttpInitializationError extends CoreForgeError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CF-HTTP_INITIALIZATION_ERROR', cause);
  }
}

export class AdapterNotFoundError extends CoreForgeError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CF-ADAPTER_NOT_FOUND_ERROR', cause);
  }
}

export class DuplicateAdapterError extends CoreForgeError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CF-DUPLICATE_ADAPTER_ERROR', cause);
  }
}

export class InvalidRequestError extends CoreForgeError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CF-INVALID_REQUEST_ERROR', cause);
  }
}

export class InvalidResponseError extends CoreForgeError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CF-INVALID_RESPONSE_ERROR', cause);
  }
}
