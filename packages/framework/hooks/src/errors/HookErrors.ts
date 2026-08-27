import { CoreForgeError } from '@coreforge/errors';

export class HookError extends CoreForgeError {
  constructor(message: string, code = 'CF-HOOK', details?: unknown) {
    super(message, code, details);
  }
}

export class HookConfigurationError extends HookError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-HOOK-CONFIGURATION', details);
  }
}

export class HookRegistrationError extends HookError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-HOOK-REGISTRATION', details);
  }
}

export class HookDuplicateError extends HookError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-HOOK-DUPLICATE', details);
  }
}

export class HookStateError extends HookError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-HOOK-STATE', details);
  }
}

export class HookExecutionError extends HookError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-HOOK-EXECUTION', details);
  }
}

export class HookContinuationError extends HookError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-HOOK-CONTINUATION', details);
  }
}

export class HookCancellationError extends HookError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-HOOK-CANCELLATION', details);
  }
}

export class HookLifecycleError extends HookError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-HOOK-LIFECYCLE', details);
  }
}

export class HookTimeoutError extends HookError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-HOOK-TIMEOUT', details);
  }
}
