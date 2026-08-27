import { CoreForgeError } from '@coreforge/errors';

export class KernelError extends CoreForgeError {
  constructor(message: string, code = 'CF-KERNEL', details?: unknown) {
    super(message, code, details);
  }
}

export class KernelConfigurationError extends KernelError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-KERNEL-CONFIGURATION', details);
  }
}

export class KernelStateError extends KernelError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-KERNEL-STATE', details);
  }
}

export class KernelRegistrationError extends KernelError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-KERNEL-REGISTRATION', details);
  }
}

export class KernelDependencyError extends KernelError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-KERNEL-DEPENDENCY', details);
  }
}

export class KernelStartupError extends KernelError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-KERNEL-STARTUP', details);
  }
}

export class KernelShutdownError extends KernelError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-KERNEL-SHUTDOWN', details);
  }
}

export class KernelExecutionError extends KernelError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-KERNEL-EXECUTION', details);
  }
}

export class KernelCancellationError extends KernelError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-KERNEL-CANCELLATION', details);
  }
}

export class KernelTimeoutError extends KernelError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-KERNEL-TIMEOUT', details);
  }
}

export class KernelComponentError extends KernelError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-KERNEL-COMPONENT', details);
  }
}

export class KernelConcurrencyError extends KernelError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-KERNEL-CONCURRENCY', details);
  }
}

export class KernelValidationError extends KernelError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-KERNEL-VALIDATION', details);
  }
}

export class KernelInitializationError extends KernelError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-KERNEL-INITIALIZATION', details);
  }
}
