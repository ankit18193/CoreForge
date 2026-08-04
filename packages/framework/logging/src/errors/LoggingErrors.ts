import { CoreForgeError } from '@coreforge/errors';

export class InvalidLogLevelError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'INVALID_LOG_LEVEL', details);
  }
}

export class FormatterError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'FORMATTER_ERROR', details);
  }
}

export class WriterError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'WRITER_ERROR', details);
  }
}
