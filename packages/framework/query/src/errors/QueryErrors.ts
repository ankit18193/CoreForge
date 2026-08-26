import { CoreForgeError } from '@coreforge/errors';

export class QueryError extends CoreForgeError {
  constructor(message: string, code = 'CF-QUERY-ERROR', details?: unknown) {
    super(message, code, details);
  }
}

export class QueryConfigurationError extends QueryError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-QUERY-CONFIGURATION', details);
  }
}

export class QueryStateError extends QueryError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-QUERY-STATE', details);
  }
}

export class QueryValidationError extends QueryError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-QUERY-VALIDATION', details);
  }
}

export class QueryHandlerRegistrationError extends QueryError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-QUERY-HANDLER-REGISTRATION', details);
  }
}

export class QueryHandlerNotFoundError extends QueryError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-QUERY-HANDLER-NOT-FOUND', details);
  }
}

export class QueryExecutionError extends QueryError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-QUERY-EXECUTION', details);
  }
}

export class QueryCancellationError extends QueryError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-QUERY-CANCELLATION', details);
  }
}

export class QueryConcurrencyError extends QueryError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-QUERY-CONCURRENCY', details);
  }
}

export class QuerySnapshotError extends QueryError {
  constructor(message: string, details?: unknown) {
    super(message, 'CF-QUERY-SNAPSHOT', details);
  }
}
