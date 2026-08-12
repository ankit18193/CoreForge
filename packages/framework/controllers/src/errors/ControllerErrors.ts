import { CoreForgeError } from '@coreforge/errors';

export class DuplicateControllerError extends CoreForgeError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CF-DUPLICATE_CONTROLLER_ERROR', cause);
  }
}

export class ActionNotFoundError extends CoreForgeError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CF-ACTION_NOT_FOUND_ERROR', cause);
  }
}

export class ControllerStateError extends CoreForgeError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CF-CONTROLLER_STATE_ERROR', cause);
  }
}
