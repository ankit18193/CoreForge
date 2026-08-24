import { CoreForgeError } from '@coreforge/errors';

export class JobError extends CoreForgeError {
  constructor(message: string, code = 'CF-JOB-ERROR', details?: unknown) {
    super(message, code, details);
  }
}

export class JobConfigurationError extends JobError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-JOB-CONFIGURATION', details);
  }
}

export class JobStateError extends JobError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-JOB-STATE', details);
  }
}

export class JobRegistrationError extends JobError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-JOB-REGISTRATION', details);
  }
}

export class JobQueueError extends JobError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-JOB-QUEUE', details);
  }
}

export class JobNotFoundError extends JobError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-JOB-NOT-FOUND', details);
  }
}

export class JobPayloadError extends JobError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-JOB-PAYLOAD', details);
  }
}

export class JobExecutionError extends JobError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-JOB-EXECUTION', details);
  }
}

export class JobRetryError extends JobError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-JOB-RETRY', details);
  }
}

export class JobCancellationError extends JobError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-JOB-CANCELLATION', details);
  }
}

export class JobConcurrencyError extends JobError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-JOB-CONCURRENCY', details);
  }
}

export class JobDeduplicationError extends JobError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-JOB-DEDUPLICATION', details);
  }
}

export class JobShutdownError extends JobError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-JOB-SHUTDOWN', details);
  }
}
