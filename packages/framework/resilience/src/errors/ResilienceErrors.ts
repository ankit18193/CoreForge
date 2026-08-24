import { CoreForgeError } from '@coreforge/errors';

export class ResilienceError extends CoreForgeError {
  constructor(message: string, code = 'CF-RESILIENCE-ERROR', details?: unknown) {
    super(message, code, details);
  }
}

export class ResilienceConfigurationError extends ResilienceError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-RESILIENCE-CONFIGURATION', details);
  }
}

export class ResilienceStateError extends ResilienceError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-RESILIENCE-STATE', details);
  }
}

export class RetryConfigurationError extends ResilienceError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-RESILIENCE-RETRY-CONFIGURATION', details);
  }
}

export class RetryExhaustedError extends ResilienceError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-RESILIENCE-RETRY-EXHAUSTED', details);
  }
}

export class TimeoutError extends ResilienceError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-RESILIENCE-TIMEOUT', details);
  }
}

export class CancellationError extends ResilienceError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-RESILIENCE-CANCELLATION', details);
  }
}

export class CircuitOpenError extends ResilienceError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-RESILIENCE-CIRCUIT-OPEN', details);
  }
}

export class CircuitStateError extends ResilienceError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-RESILIENCE-CIRCUIT-STATE', details);
  }
}

export class BulkheadRejectedError extends ResilienceError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-RESILIENCE-BULKHEAD-REJECTED', details);
  }
}

export class BulkheadConfigurationError extends ResilienceError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-RESILIENCE-BULKHEAD-CONFIGURATION', details);
  }
}

export class FallbackError extends ResilienceError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-RESILIENCE-FALLBACK', details);
  }
}

export class FailureClassificationError extends ResilienceError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-RESILIENCE-CLASSIFICATION', details);
  }
}
