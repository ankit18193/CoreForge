import { HttpErrorMapper, HttpErrorMappingResult, HttpPublicError } from '@coreforge/contracts';

import { HttpErrorMappingValidationError } from '../../errors/HttpErrorMappingErrors';

export class HttpErrorMappingValidator {
  public static validateStatus(status: number): void {
    if (typeof status !== 'number' || !Number.isInteger(status) || status < 100 || status > 599) {
      throw new HttpErrorMappingValidationError(
        `Invalid HTTP status code: ${status}. Must be an integer between 100 and 599.`,
        { status },
      );
    }
  }

  public static validatePublicError(publicError: HttpPublicError): void {
    if (!publicError || typeof publicError !== 'object') {
      throw new HttpErrorMappingValidationError('Public error must be a non-null object.', {
        publicError,
      });
    }

    if (typeof publicError.code !== 'string' || publicError.code.trim().length === 0) {
      throw new HttpErrorMappingValidationError(
        'Public error must possess a non-empty string "code".',
        { code: publicError.code },
      );
    }

    if (typeof publicError.message !== 'string' || publicError.message.trim().length === 0) {
      throw new HttpErrorMappingValidationError(
        'Public error must possess a non-empty string "message".',
        { message: publicError.message },
      );
    }
  }

  public static validateResult(result: HttpErrorMappingResult): void {
    if (!result || typeof result !== 'object') {
      throw new HttpErrorMappingValidationError(
        'HttpErrorMappingResult must be a non-null object.',
      );
    }

    this.validateStatus(result.status);
    this.validatePublicError(result.publicError);

    if (result.headers !== undefined) {
      if (typeof result.headers !== 'object' || result.headers === null) {
        throw new HttpErrorMappingValidationError(
          'HttpErrorMappingResult headers must be an object if defined.',
          { headers: result.headers },
        );
      }
    }
  }

  public static validateMapper(mapper: HttpErrorMapper): void {
    if (!mapper || typeof mapper !== 'object') {
      throw new HttpErrorMappingValidationError('HttpErrorMapper must be an object.');
    }

    if (typeof mapper.id !== 'string' || mapper.id.trim().length === 0) {
      throw new HttpErrorMappingValidationError(
        'HttpErrorMapper must have a non-empty string "id".',
        {
          id: mapper.id,
        },
      );
    }

    if (typeof mapper.map !== 'function') {
      throw new HttpErrorMappingValidationError(
        `HttpErrorMapper "${mapper.id}" must implement a "map" function.`,
      );
    }
  }
}
