import {
  HttpHeaders,
  HttpErrorMapper,
  HttpErrorMappingContext,
  HttpErrorMappingResult,
} from '@coreforge/contracts';
import { CoreForgeError } from '@coreforge/errors';
import {
  TransportAdapterNotFoundError,
  TransportCancellationError,
  TransportStateError,
  TransportTimeoutError,
  TransportValidationError,
} from '@coreforge/transport';

import { HttpErrorSanitizer } from './HttpErrorSanitizer';
import { HttpPublicErrorSnapshot } from './HttpPublicErrorSnapshot';
import {
  HttpCancellationError,
  HttpError,
  HttpStateError,
  HttpTimeoutError,
  HttpValidationError,
} from '../../errors/HttpErrors';
import { HTTP_STATUS_CODES, HttpErrorMappingOptions } from '../../types/httpTypes';

export class DefaultHttpErrorMapper implements HttpErrorMapper {
  public readonly id = 'coreforge-default-error-mapper';
  public readonly name = 'DefaultHttpErrorMapper';
  public readonly priority = -1000;

  private readonly _options: HttpErrorMappingOptions;

  constructor(options: HttpErrorMappingOptions = {}) {
    this._options = options;
  }

  public canMap(_error: unknown): boolean {
    return true;
  }

  public map(error: unknown, context: HttpErrorMappingContext): HttpErrorMappingResult {
    const status = this.resolveStatus(error);
    const headers: HttpHeaders = {};

    let code = 'CF-INTERNAL-ERROR';
    let message = 'An internal server error occurred.';
    let details: unknown = undefined;

    if (error instanceof CoreForgeError || error instanceof HttpError) {
      code = error.code;
      message = HttpErrorSanitizer.sanitizeString(error.message);

      if (this._options.includeErrorDetails && error.details !== undefined) {
        details = HttpErrorSanitizer.sanitizeDetails(error.details, this._options.sensitiveKeys);
      }
    } else if (status !== HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR && error instanceof Error) {
      // If error matched a non-500 status (e.g. custom status or known predicate), sanitize message
      code = 'ERR_' + error.name.toUpperCase();
      message = HttpErrorSanitizer.sanitizeString(error.message);
    } else {
      // Unknown 500 error: completely mask internal message and stack
      code = 'INTERNAL_ERROR';
      message = 'An internal server error occurred.';
    }

    // Safe error headers for known HTTP status codes
    if (status === HTTP_STATUS_CODES.UNAUTHORIZED && context.metadata?.wwwAuthenticate) {
      headers['www-authenticate'] = String(context.metadata.wwwAuthenticate);
    } else if (status === HTTP_STATUS_CODES.TOO_MANY_REQUESTS && context.metadata?.retryAfter) {
      headers['retry-after'] = String(context.metadata.retryAfter);
    } else if (status === HTTP_STATUS_CODES.METHOD_NOT_ALLOWED && context.metadata?.allow) {
      headers['allow'] = String(context.metadata.allow);
    }

    const publicError = HttpPublicErrorSnapshot.createPublicError(code, message, details);
    return HttpPublicErrorSnapshot.createResult(status, publicError, headers);
  }

  public resolveStatus(error: unknown): number {
    if (!error) {
      return HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR;
    }

    const errObj = error as Record<string, unknown>;
    const code = typeof errObj.code === 'string' ? errObj.code : '';
    const name = typeof errObj.name === 'string' ? errObj.name : '';

    // Check custom status map first
    if (this._options.customStatusMap) {
      if (code && code in this._options.customStatusMap) {
        return this._options.customStatusMap[code];
      }
      if (name && name in this._options.customStatusMap) {
        return this._options.customStatusMap[name];
      }
    }

    // Cancellation handling
    if (
      error instanceof TransportCancellationError ||
      error instanceof HttpCancellationError ||
      name === 'AbortError' ||
      name.includes('Cancel') ||
      name.includes('Abort') ||
      code.includes('CANCEL') ||
      code.includes('ABORT')
    ) {
      return this._options.cancellationStatus ?? HTTP_STATUS_CODES.CLIENT_CLOSED_REQUEST;
    }

    // Validation handling
    if (
      error instanceof TransportValidationError ||
      error instanceof HttpValidationError ||
      code.includes('VALIDATION') ||
      name.includes('Validation')
    ) {
      return HTTP_STATUS_CODES.BAD_REQUEST;
    }

    // Authentication handling
    if (
      code.includes('UNAUTHORIZED') ||
      code.includes('AUTHENTICATION') ||
      name.includes('Unauthorized') ||
      name.includes('Authentication')
    ) {
      return HTTP_STATUS_CODES.UNAUTHORIZED;
    }

    // Authorization handling
    if (
      code.includes('FORBIDDEN') ||
      code.includes('AUTHORIZATION') ||
      name.includes('Forbidden') ||
      name.includes('Authorization')
    ) {
      return HTTP_STATUS_CODES.FORBIDDEN;
    }

    // Method Not Allowed handling
    if (
      code.includes('METHOD_NOT_ALLOWED') ||
      code.includes('METHOD-NOT-ALLOWED') ||
      name.includes('MethodNotAllowed')
    ) {
      return HTTP_STATUS_CODES.METHOD_NOT_ALLOWED;
    }

    // Not Found handling
    if (
      error instanceof TransportAdapterNotFoundError ||
      code.includes('NOT_FOUND') ||
      code.includes('ADAPTER-NOT-FOUND') ||
      code.includes('ROUTE-NOT-FOUND') ||
      name.includes('NotFound')
    ) {
      return HTTP_STATUS_CODES.NOT_FOUND;
    }

    // Conflict handling
    if (code.includes('CONFLICT') || name.includes('Conflict')) {
      return HTTP_STATUS_CODES.CONFLICT;
    }

    // Rate Limit handling
    if (code.includes('RATE_LIMIT') || name.includes('RateLimit')) {
      return HTTP_STATUS_CODES.TOO_MANY_REQUESTS;
    }

    // Timeout handling
    if (
      error instanceof TransportTimeoutError ||
      error instanceof HttpTimeoutError ||
      code.includes('TIMEOUT') ||
      name.includes('Timeout')
    ) {
      return HTTP_STATUS_CODES.GATEWAY_TIMEOUT;
    }

    // State / Unavailable handling
    if (
      error instanceof TransportStateError ||
      error instanceof HttpStateError ||
      code.includes('STATE') ||
      name.includes('State')
    ) {
      return HTTP_STATUS_CODES.SERVICE_UNAVAILABLE;
    }

    return HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR;
  }
}
