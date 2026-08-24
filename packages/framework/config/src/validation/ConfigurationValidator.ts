import { ConfigurationSchema } from './ConfigurationSchema';
import { ConfigurationAccessor } from '../access/ConfigurationAccessor';
import { ConfigurationPath } from '../access/ConfigurationPath';
import {
  ConfigurationMissingError,
  ConfigurationTypeError,
  ConfigurationValidationError,
} from '../errors/ConfigurationErrors';
import { ConfigurationValidationRule } from '../types/configurationTypes';

export class ConfigurationValidator {
  public static validate(
    target: Record<string, unknown>,
    schema?: ConfigurationSchema<unknown>,
  ): Record<string, unknown> {
    if (!target || typeof target !== 'object') {
      throw new ConfigurationValidationError(
        'Invalid configuration target: expected non-null object.',
      );
    }

    // Clone to allow default injections
    const cloned = JSON.parse(JSON.stringify(target));

    if (!schema) {
      return cloned;
    }

    // 1. Validate rules
    for (const rule of schema.rules) {
      this._evaluateRule(cloned, rule);
    }

    // 2. Run custom schema validator if defined
    return schema.validate(cloned) as Record<string, unknown>;
  }

  private static _evaluateRule(
    target: Record<string, unknown>,
    rule: ConfigurationValidationRule,
  ): void {
    let value = ConfigurationAccessor.get(target, rule.path);

    // Apply default if undefined
    if (value === undefined && rule.default !== undefined) {
      this._setValue(target, rule.path, rule.default);
      value = rule.default;
    }

    // Check required
    if (rule.required && (value === undefined || value === null || value === '')) {
      throw new ConfigurationMissingError(rule.path);
    }

    if (value === undefined || value === null) {
      return;
    }

    // Check type
    if (rule.type) {
      this._validateType(rule.path, value, rule.type);
    }

    // Check enum
    if (rule.enumValues && rule.enumValues.length > 0) {
      if (!rule.enumValues.includes(value)) {
        throw new ConfigurationValidationError(
          `Value '${String(value)}' is not in allowed values: [${rule.enumValues.join(', ')}].`,
          rule.path,
        );
      }
    }

    // Check range for numbers
    if (typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        throw new ConfigurationValidationError(
          `Value ${value} is less than minimum allowed ${rule.min}.`,
          rule.path,
        );
      }
      if (rule.max !== undefined && value > rule.max) {
        throw new ConfigurationValidationError(
          `Value ${value} exceeds maximum allowed ${rule.max}.`,
          rule.path,
        );
      }
    }

    // Check regex pattern for strings
    if (typeof value === 'string' && rule.pattern) {
      const reg = typeof rule.pattern === 'string' ? new RegExp(rule.pattern) : rule.pattern;
      if (!reg.test(value)) {
        throw new ConfigurationValidationError(
          `Value '${value}' does not match pattern '${reg.source}'.`,
          rule.path,
        );
      }
    }

    // Run custom rule validator
    if (rule.validator) {
      try {
        const result = rule.validator(value);
        if (result === false || typeof result === 'string') {
          throw new ConfigurationValidationError(
            typeof result === 'string' ? result : `Custom validation rule failed.`,
            rule.path,
          );
        }
      } catch (err) {
        if (err instanceof ConfigurationValidationError) {
          throw err;
        }
        throw new ConfigurationValidationError(
          err instanceof Error ? err.message : String(err),
          rule.path,
          err,
        );
      }
    }
  }

  private static _validateType(path: string, value: unknown, expectedType: string): void {
    if (expectedType === 'string') {
      if (typeof value !== 'string') {
        throw new ConfigurationTypeError(path, 'string', typeof value);
      }
    } else if (expectedType === 'number') {
      if (typeof value !== 'number' || Number.isNaN(value)) {
        throw new ConfigurationTypeError(path, 'number', typeof value);
      }
    } else if (expectedType === 'boolean') {
      if (typeof value !== 'boolean') {
        throw new ConfigurationTypeError(path, 'boolean', typeof value);
      }
    } else if (expectedType === 'array') {
      if (!Array.isArray(value)) {
        throw new ConfigurationTypeError(path, 'array', typeof value);
      }
    } else if (expectedType === 'object') {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new ConfigurationTypeError(path, 'object', typeof value);
      }
    } else if (expectedType === 'enum') {
      if (typeof value !== 'string' && typeof value !== 'number') {
        throw new ConfigurationTypeError(path, 'enum', typeof value);
      }
    }
  }

  private static _setValue(target: Record<string, unknown>, path: string, value: unknown): void {
    const segments = ConfigurationPath.parse(path);
    let current = target;
    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i];
      if (!current[seg] || typeof current[seg] !== 'object') {
        current[seg] = {};
      }
      current = current[seg] as Record<string, unknown>;
    }
    const last = segments[segments.length - 1];
    current[last] = value;
  }
}
