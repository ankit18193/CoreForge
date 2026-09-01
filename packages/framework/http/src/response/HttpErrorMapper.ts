import {
  HttpErrorMapper as IHttpErrorMapper,
  HttpErrorMappingContext,
  HttpErrorMappingResult,
} from '@coreforge/contracts';
import { CoreForgeError } from '@coreforge/errors';

import { DefaultHttpErrorMapper } from './error/DefaultHttpErrorMapper';
import { HttpErrorSanitizer } from './error/HttpErrorSanitizer';
import { HttpPublicErrorSnapshot } from './error/HttpPublicErrorSnapshot';
import { HttpError } from '../errors/HttpErrors';
import { HttpErrorMappingOptions } from '../types/httpTypes';

export class HttpErrorMapper implements IHttpErrorMapper {
  public readonly id = 'coreforge-http-error-mapper';
  public readonly name = 'HttpErrorMapper';
  private readonly _defaultMapper: DefaultHttpErrorMapper;

  constructor(options: HttpErrorMappingOptions = {}) {
    this._defaultMapper = new DefaultHttpErrorMapper(options);
  }

  public canMap(_error: unknown): boolean {
    return true;
  }

  public map(error: unknown, context?: HttpErrorMappingContext): HttpErrorMappingResult {
    return this._defaultMapper.map(error, context ?? HttpPublicErrorSnapshot.createContext());
  }

  public static resolveStatus(error: unknown, options: HttpErrorMappingOptions = {}): number {
    const mapper = new DefaultHttpErrorMapper(options);
    return mapper.resolveStatus(error);
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
      message = HttpErrorSanitizer.sanitizeString(error.message);
      if (options.includeErrorDetails && error.details !== undefined) {
        details = HttpErrorSanitizer.sanitizeDetails(error.details, options.sensitiveKeys);
      }
    } else if (error instanceof Error) {
      code = 'ERR_' + error.name.toUpperCase();
      message = HttpErrorSanitizer.sanitizeString(error.message);
      if (options.includeErrorDetails) {
        details = {
          stack: error.stack ? HttpErrorSanitizer.sanitizeString(error.stack) : undefined,
        };
      }
    } else if (typeof error === 'string') {
      message = HttpErrorSanitizer.sanitizeString(error);
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
