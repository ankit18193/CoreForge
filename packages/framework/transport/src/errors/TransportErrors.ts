import { CoreForgeError } from '@coreforge/errors';

export class TransportError extends CoreForgeError {
  constructor(message: string, code = 'CF-TRANSPORT-ERROR', details?: unknown) {
    super(message, code, details);
  }
}

export class TransportConfigurationError extends TransportError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-TRANSPORT-CONFIG-ERROR', details);
  }
}

export class TransportAdapterError extends TransportError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-TRANSPORT-ADAPTER-ERROR', details);
  }
}

export class TransportNormalizationError extends TransportError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-TRANSPORT-NORMALIZATION-ERROR', details);
  }
}

export class TransportResponseError extends TransportError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-TRANSPORT-RESPONSE-ERROR', details);
  }
}

export class TransportStateError extends TransportError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-TRANSPORT-STATE-ERROR', details);
  }
}

export class TransportPipelineError extends TransportError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-TRANSPORT-PIPELINE-ERROR', details);
  }
}

export class TransportShutdownError extends TransportError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-TRANSPORT-SHUTDOWN-ERROR', details);
  }
}
