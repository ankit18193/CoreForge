import { CoreForgeError } from '@coreforge/errors';

export class LoggingError extends CoreForgeError {
  constructor(message: string, code = 'CF-LOGGING-ERROR', details?: unknown) {
    super(message, code, details);
  }
}

export class LoggingConfigurationError extends LoggingError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-LOGGING-CONFIGURATION', details);
  }
}

export class LoggingStateError extends LoggingError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-LOGGING-STATE', details);
  }
}

export class LoggingPipelineError extends LoggingError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-LOGGING-PIPELINE', details);
  }
}

export class LoggingProcessorError extends LoggingError {
  public readonly processorName: string;

  constructor(processorName: string, message: string, cause?: unknown) {
    super(`Log processor '${processorName}' failed: ${message}`, 'CF-LOGGING-PROCESSOR', {
      processorName,
      cause: cause instanceof Error ? cause.message : cause,
    });
    this.processorName = processorName;
  }
}

export class LoggingSinkError extends LoggingError {
  public readonly sinkName: string;

  constructor(sinkName: string, message: string, cause?: unknown) {
    super(`Log sink '${sinkName}' failed: ${message}`, 'CF-LOGGING-SINK', {
      sinkName,
      cause: cause instanceof Error ? cause.message : cause,
    });
    this.sinkName = sinkName;
  }
}

export class LoggingSerializationError extends LoggingError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-LOGGING-SERIALIZATION', details);
  }
}

export class LoggingSecurityError extends LoggingError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-LOGGING-SECURITY', details);
  }
}
