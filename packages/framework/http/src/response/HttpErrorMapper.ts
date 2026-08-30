import { CoreForgeError } from '@coreforge/errors';
import {
  TransportAdapterNotFoundError,
  TransportCancellationError,
  TransportStateError,
  TransportTimeoutError,
  TransportValidationError,
} from '@coreforge/transport';

import {
  HttpCancellationError,
  HttpError,
  HttpStateError,
  HttpTimeoutError,
  HttpValidationError,
} from '../errors/HttpErrors';
import { HTTP_STATUS_CODES, HttpErrorMappingOptions } from '../types/httpTypes';

function sanitizeMessage(msg: string): string {
  // Redact potential passwords, bearer tokens, connection strings
  return msg
    .replace(/(bearer\s+)[a-zA-Z0-9_\-.]+/gi, '$1[REDACTED]')
    .replace(/(password=)[^\s&]+/gi, '$1[REDACTED]')
    .replace(/(token=)[^\s&]+/gi, '$1[REDACTED]')
    .replace(/(secret=)[^\s&]+/gi, '$1[REDACTED]')
    .replace(/(postgres|mongodb|mysql|redis):\/\/[^\s]+/gi, '$1://[REDACTED]');
}

export class HttpErrorMapper {
  public static resolveStatus(error: unknown, options: HttpErrorMappingOptions = {}): number {
    if (!error) {
      return HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR;
    }

    const errObj = error as Record<string, unknown>;
    const code = typeof errObj.code === 'string' ? errObj.code : '';
    const name = typeof errObj.name === 'string' ? errObj.name : '';

    // Check custom status map first
    if (options.customStatusMap) {
      if (code && code in options.customStatusMap) {
        return options.customStatusMap[code];
      }
      if (name && name in options.customStatusMap) {
        return options.customStatusMap[name];
      }
    }

    // Cancellation handling (explicit configurable semantics)
    if (
      error instanceof TransportCancellationError ||
      error instanceof HttpCancellationError ||
      name === 'AbortError' ||
      code.includes('CANCELLATION')
    ) {
      return options.cancellationStatus ?? HTTP_STATUS_CODES.CLIENT_CLOSED_REQUEST;
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

  public static toErrorPayload(
    error: unknown,
    options: HttpErrorMappingOptions = {},
  ): {
    readonly error: {
      readonly code: string;
      readonly message: string;
      readonly details?: unknown;
    };
  } {
    let code = 'CF-INTERNAL-ERROR';
    let message = 'An unexpected internal error occurred';
    let details: unknown = undefined;

    if (error instanceof CoreForgeError || error instanceof HttpError) {
      code = error.code;
      message = sanitizeMessage(error.message);
      if (options.includeErrorDetails && error.details !== undefined) {
        details = error.details;
      }
    } else if (error instanceof Error) {
      code = 'ERR_' + error.name.toUpperCase();
      message = sanitizeMessage(error.message);
      if (options.includeErrorDetails) {
        details = { stack: error.stack };
      }
    } else if (typeof error === 'string') {
      message = sanitizeMessage(error);
    }

    const payload = {
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
      },
    };

    return Object.freeze(payload);
  }
}
