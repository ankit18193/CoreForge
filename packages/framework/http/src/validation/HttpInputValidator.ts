import type { HttpBindingSource, HttpValidationErrorDetail } from '@coreforge/contracts';

export interface HttpValidationConstraints {
  readonly required?: boolean | undefined;
  readonly min?: number | undefined;
  readonly max?: number | undefined;
  readonly minLength?: number | undefined;
  readonly maxLength?: number | undefined;
  readonly pattern?: RegExp | string | undefined;
  readonly enum?: readonly unknown[] | undefined;
}

export class HttpInputValidator {
  public static validateConstraints(
    field: string,
    value: unknown,
    constraints: HttpValidationConstraints,
    source?: HttpBindingSource,
  ): readonly HttpValidationErrorDetail[] {
    const errors: HttpValidationErrorDetail[] = [];

    // 1. Required check
    if (constraints.required) {
      if (
        value === undefined ||
        value === null ||
        (typeof value === 'string' && value.trim() === '')
      ) {
        errors.push({
          field,
          source,
          code: 'REQUIRED_FIELD_MISSING',
          message: `Field '${field}' is required`,
        });
        return Object.freeze(errors);
      }
    }

    // If value is optional and undefined/null, skip further constraint checks
    if (value === undefined || value === null) {
      return Object.freeze(errors);
    }

    // 2. Numeric Min / Max
    if (typeof value === 'number') {
      if (constraints.min !== undefined && value < constraints.min) {
        errors.push({
          field,
          source,
          code: 'MIN_VALUE_EXCEEDED',
          message: `Field '${field}' must be at least ${constraints.min}`,
        });
      }
      if (constraints.max !== undefined && value > constraints.max) {
        errors.push({
          field,
          source,
          code: 'MAX_VALUE_EXCEEDED',
          message: `Field '${field}' must be at most ${constraints.max}`,
        });
      }
    }

    // 3. String & Array Length Constraints
    if (typeof value === 'string' || Array.isArray(value)) {
      const length = value.length;
      if (constraints.minLength !== undefined && length < constraints.minLength) {
        errors.push({
          field,
          source,
          code: 'MIN_LENGTH_VIOLATION',
          message: `Field '${field}' length must be at least ${constraints.minLength}`,
        });
      }
      if (constraints.maxLength !== undefined && length > constraints.maxLength) {
        errors.push({
          field,
          source,
          code: 'MAX_LENGTH_VIOLATION',
          message: `Field '${field}' length must be at most ${constraints.maxLength}`,
        });
      }
    }

    // 4. Pattern matching
    if (typeof value === 'string' && constraints.pattern !== undefined) {
      const regex =
        typeof constraints.pattern === 'string'
          ? new RegExp(constraints.pattern)
          : constraints.pattern;

      if (!regex.test(value)) {
        errors.push({
          field,
          source,
          code: 'PATTERN_MISMATCH',
          message: `Field '${field}' does not match required pattern`,
        });
      }
    }

    // 5. Enum validation
    if (constraints.enum !== undefined && Array.isArray(constraints.enum)) {
      if (!constraints.enum.includes(value)) {
        errors.push({
          field,
          source,
          code: 'INVALID_ENUM_VALUE',
          message: `Field '${field}' must be one of: ${constraints.enum.map(String).join(', ')}`,
        });
      }
    }

    return Object.freeze(errors);
  }
}
