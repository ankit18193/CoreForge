import type {
  HttpBindingDefinition,
  HttpBindingResult,
  HttpValidationErrorDetail,
  HttpValidationResult,
} from '@coreforge/contracts';

import { HttpInputValidator, HttpValidationConstraints } from './HttpInputValidator';
import { HttpBindingPlan } from '../binding/HttpBindingPlan';
import { HttpBindingSnapshot } from '../binding/HttpBindingSnapshot';
import { HttpValueTransformer } from '../binding/HttpValueTransformer';
import { HttpBindingTransformationError } from '../errors/HttpBindingErrors';

const SENSITIVE_FIELDS: ReadonlySet<string> = new Set<string>([
  'password',
  'passwd',
  'secret',
  'token',
  'authorization',
  'apikey',
  'api_key',
  'cookie',
  'credential',
  'credentials',
]);

export class HttpValidationEngine {
  /**
   * Validate and transform a single field definition against raw input.
   */
  public static validateField(
    definition: HttpBindingDefinition,
    rawValue: unknown,
    constraints?: HttpValidationConstraints,
  ): { value?: unknown; errors: readonly HttpValidationErrorDetail[] } {
    const errors: HttpValidationErrorDetail[] = [];
    const target = definition.target;
    const source = definition.source;

    // 1. Presence / Required Check
    const effectiveValue = rawValue !== undefined ? rawValue : definition.defaultValue;
    const isRequired = definition.required ?? constraints?.required ?? false;

    if (
      isRequired &&
      (effectiveValue === undefined || effectiveValue === null || effectiveValue === '')
    ) {
      errors.push({
        field: target,
        source,
        code: 'REQUIRED_FIELD_MISSING',
        message: `Field '${target}' is required`,
      });
      return { errors: Object.freeze(errors) };
    }

    if (effectiveValue === undefined || effectiveValue === null) {
      return { value: undefined, errors: Object.freeze(errors) };
    }

    // 2. Type Transformation
    let transformedValue: unknown = effectiveValue;
    if (definition.type) {
      try {
        transformedValue = HttpValueTransformer.transform(effectiveValue, definition.type, target);
      } catch (err: unknown) {
        if (err instanceof HttpBindingTransformationError) {
          errors.push({
            field: target,
            source,
            code: 'TYPE_TRANSFORMATION_FAILED',
            message: `Field '${target}' could not be transformed to type '${definition.type}'`,
          });
        } else {
          errors.push({
            field: target,
            source,
            code: 'TYPE_TRANSFORMATION_FAILED',
            message: `Field '${target}' failed transformation`,
          });
        }
        return { errors: Object.freeze(errors) };
      }
    }

    // 3. Constraint Validation
    const combinedConstraints: HttpValidationConstraints = {
      required: isRequired,
      ...constraints,
    };

    const constraintErrors = HttpInputValidator.validateConstraints(
      target,
      transformedValue,
      combinedConstraints,
      source,
    );

    if (constraintErrors.length > 0) {
      errors.push(...constraintErrors);
    }

    return {
      value: errors.length === 0 ? transformedValue : undefined,
      errors: Object.freeze(errors),
    };
  }

  /**
   * Validate and transform all extracted raw values against an HttpBindingPlan.
   */
  public static validatePlan(
    plan: HttpBindingPlan,
    rawValues: Record<string, unknown>,
    startTime = performance.now(),
  ): HttpBindingResult<Record<string, unknown>> {
    const boundValues: Record<string, unknown> = {};
    const allErrors: HttpValidationErrorDetail[] = [];

    for (const def of plan.definitions) {
      const raw = rawValues[def.target];
      const result = HttpValidationEngine.validateField(def, raw);

      if (result.errors.length > 0) {
        allErrors.push(...result.errors);
      } else if (result.value !== undefined) {
        boundValues[def.target] = result.value;
      }
    }

    const durationMs = performance.now() - startTime;
    const success = allErrors.length === 0;

    return HttpBindingSnapshot.createResult(
      success,
      durationMs,
      success ? HttpBindingSnapshot.deepFreeze(boundValues) : undefined,
      allErrors,
    );
  }

  /**
   * Check if a field name is considered sensitive and sanitize error output if needed.
   */
  public static isSensitiveField(field: string): boolean {
    return SENSITIVE_FIELDS.has(field.toLowerCase());
  }

  /**
   * Validate arbitrary value against an array of validation rules.
   */
  public static validateValue(
    field: string,
    value: unknown,
    constraints: HttpValidationConstraints,
  ): HttpValidationResult {
    const errors = HttpInputValidator.validateConstraints(field, value, constraints);
    return Object.freeze({
      valid: errors.length === 0,
      errors,
    });
  }
}
