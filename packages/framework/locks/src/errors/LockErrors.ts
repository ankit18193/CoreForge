import { CoreForgeError } from '@coreforge/errors';

export class LockError extends CoreForgeError {
  constructor(message: string, code = 'CF-LOCK-ERROR', details?: unknown) {
    super(message, code, details);
  }
}

export class LockConfigurationError extends LockError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-LOCK-CONFIGURATION', details);
  }
}

export class LockStateError extends LockError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-LOCK-STATE', details);
  }
}

export class LockKeyError extends LockError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-LOCK-KEY', details);
  }
}

export class LockProviderError extends LockError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-LOCK-PROVIDER', details);
  }
}

export class LockAcquisitionError extends LockError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-LOCK-ACQUISITION', details);
  }
}

export class LockAcquisitionTimeoutError extends LockError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-LOCK-TIMEOUT', details);
  }
}

export class LockOwnershipError extends LockError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-LOCK-OWNERSHIP', details);
  }
}

export class LockLeaseExpiredError extends LockError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-LOCK-LEASE-EXPIRED', details);
  }
}

export class LockRenewalError extends LockError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-LOCK-RENEWAL', details);
  }
}

export class LockReleaseError extends LockError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-LOCK-RELEASE', details);
  }
}

export class LockCancellationError extends LockError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-LOCK-CANCELLATION', details);
  }
}

export class LockNamespaceError extends LockError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-LOCK-NAMESPACE', details);
  }
}

export class LockConcurrencyError extends LockError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-LOCK-CONCURRENCY', details);
  }
}
