import { CoreForgeError } from '@coreforge/errors';

export class RateLimitError extends CoreForgeError {
  constructor(message: string, code = 'CF-RATE-LIMIT-ERROR', details?: unknown) {
    super(message, code, details);
  }
}

export class RateLimitConfigurationError extends RateLimitError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-RATE-LIMIT-CONFIGURATION', details);
  }
}

export class RateLimitStateError extends RateLimitError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-RATE-LIMIT-STATE', details);
  }
}

export class RateLimitKeyError extends RateLimitError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-RATE-LIMIT-KEY', details);
  }
}

export class RateLimitProviderError extends RateLimitError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-RATE-LIMIT-PROVIDER', details);
  }
}

export class RateLimitPolicyError extends RateLimitError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-RATE-LIMIT-POLICY', details);
  }
}

export class RateLimitAlgorithmError extends RateLimitError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-RATE-LIMIT-ALGORITHM', details);
  }
}

export class RateLimitCostError extends RateLimitError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-RATE-LIMIT-COST', details);
  }
}

export class RateLimitExceededError extends RateLimitError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-RATE-LIMIT-EXCEEDED', details);
  }
}

export class RateLimitConcurrencyError extends RateLimitError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-RATE-LIMIT-CONCURRENCY', details);
  }
}

export class RateLimitNamespaceError extends RateLimitError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-RATE-LIMIT-NAMESPACE', details);
  }
}
