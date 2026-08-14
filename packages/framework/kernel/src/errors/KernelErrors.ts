import { CoreForgeError } from '@coreforge/errors';

export class KernelValidationError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CF-KERNEL_VALIDATION_ERROR', details);
  }
}

export class KernelStateError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CF-KERNEL_STATE_ERROR', details);
  }
}

export class KernelInitializationError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CF-KERNEL_INITIALIZATION_ERROR', details);
  }
}
