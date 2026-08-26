import { ErrorSanitizer } from '../sanitization/ErrorSanitizer';
import { ApplicationError } from '../types/errorHandlingTypes';

export class ErrorSnapshot {
  public static create(error: ApplicationError): ApplicationError {
    const sanitizedDetails =
      error.details !== undefined ? ErrorSanitizer.sanitize(error.details) : undefined;

    return Object.freeze({
      name: error.name,
      message: error.message,
      code: error.code,
      category: error.category,
      details: sanitizedDetails,
      stack: error.stack,
      cause: error.cause,
      timestamp: error.timestamp,
    });
  }
}
