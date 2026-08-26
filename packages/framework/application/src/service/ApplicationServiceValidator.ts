import { ApplicationValidationError } from '../errors/ApplicationErrors';
import { ApplicationService } from '../types/applicationTypes';

// Control characters check regex (ASCII 0x00-0x1F and 0x7F)
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_REGEX = /[\x00-\x1F\x7F]/;

export class ApplicationServiceValidator {
  public static validateType(type: unknown): asserts type is string {
    if (typeof type !== 'string') {
      throw new ApplicationValidationError('Service type must be a string', { serviceType: type });
    }

    const trimmed = type.trim();
    if (trimmed.length === 0) {
      throw new ApplicationValidationError('Service type cannot be empty or whitespace-only', {
        serviceType: type,
      });
    }

    if (CONTROL_CHARS_REGEX.test(type)) {
      throw new ApplicationValidationError('Service type contains invalid control characters', {
        serviceType: type,
      });
    }
  }

  public static validateService<TInput, TResult>(
    service: unknown,
    type: string,
  ): asserts service is ApplicationService<TInput, TResult> {
    if (!service || typeof service !== 'object') {
      throw new ApplicationValidationError(
        'Service must be an object implementing ApplicationService interface',
        { serviceType: type, service },
      );
    }

    const s = service as Record<string, unknown>;
    if (typeof s.execute !== 'function') {
      throw new ApplicationValidationError(
        'Service must have an execute(input, context) function',
        { serviceType: type, service },
      );
    }
  }
}
