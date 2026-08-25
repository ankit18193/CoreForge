import { CoreForgeError } from '@coreforge/errors';

export class TracingError extends CoreForgeError {
  constructor(message: string, code = 'CF-TRACING-ERROR', details?: unknown) {
    super(message, code, details);
  }
}

export class TracingConfigurationError extends TracingError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-TRACING-CONFIGURATION', details);
  }
}

export class TracingStateError extends TracingError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-TRACING-STATE', details);
  }
}

export class TraceIdError extends TracingError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-TRACING-TRACE-ID', details);
  }
}

export class SpanIdError extends TracingError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-TRACING-SPAN-ID', details);
  }
}

export class SpanNameError extends TracingError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-TRACING-SPAN-NAME', details);
  }
}

export class SpanAttributeError extends TracingError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-TRACING-ATTRIBUTE', details);
  }
}

export class SpanEventError extends TracingError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-TRACING-EVENT', details);
  }
}

export class SpanLinkError extends TracingError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-TRACING-LINK', details);
  }
}

export class SpanLifecycleError extends TracingError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-TRACING-LIFECYCLE', details);
  }
}

export class TraceContextError extends TracingError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-TRACING-CONTEXT', details);
  }
}

export class TraceProviderError extends TracingError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-TRACING-PROVIDER', details);
  }
}

export class TraceSamplingError extends TracingError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-TRACING-SAMPLING', details);
  }
}

export class TraceLimitError extends TracingError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-TRACING-LIMIT', details);
  }
}
