import { CoreForgeError } from '@coreforge/errors';

export class MetricsError extends CoreForgeError {
  constructor(message: string, code = 'CF-METRICS-ERROR', details?: unknown) {
    super(message, code, details);
  }
}

export class MetricsConfigurationError extends MetricsError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-METRICS-CONFIGURATION', details);
  }
}

export class MetricsStateError extends MetricsError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-METRICS-STATE', details);
  }
}

export class MetricNameError extends MetricsError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-METRICS-NAME', details);
  }
}

export class MetricLabelError extends MetricsError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-METRICS-LABEL', details);
  }
}

export class MetricRegistrationError extends MetricsError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-METRICS-REGISTRATION', details);
  }
}

export class MetricTypeError extends MetricsError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-METRICS-TYPE', details);
  }
}

export class MetricValueError extends MetricsError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-METRICS-VALUE', details);
  }
}

export class MetricCardinalityError extends MetricsError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-METRICS-CARDINALITY', details);
  }
}

export class MetricProviderError extends MetricsError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-METRICS-PROVIDER', details);
  }
}

export class MetricSnapshotError extends MetricsError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-METRICS-SNAPSHOT', details);
  }
}

export class MetricConcurrencyError extends MetricsError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-METRICS-CONCURRENCY', details);
  }
}
