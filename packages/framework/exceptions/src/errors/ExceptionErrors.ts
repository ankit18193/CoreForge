import { CoreForgeError } from '@coreforge/errors';

export class ExceptionPipelineError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CF-EXCEPTION_PIPELINE_ERROR', details);
  }
}

export class ReporterError extends CoreForgeError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CF-REPORTER_ERROR', details);
  }
}
