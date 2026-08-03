import { ConfigurationError } from '@coreforge/errors';
import { Dictionary } from '@coreforge/types';

import { ConfigSchema } from './ConfigSchema';

export class ConfigurationValidator {
  private _schema: ConfigSchema;

  constructor(schema: ConfigSchema) {
    this._schema = schema;
  }

  public validate(raw: Dictionary<unknown>): Dictionary<unknown> {
    const result: Dictionary<unknown> = {};
    const fields = this._schema.fields;

    for (const [key, rule] of Object.entries(fields)) {
      let rawValue = raw[key];

      if (rawValue === undefined) {
        if (rule.default !== undefined) {
          rawValue = rule.default;
        } else if (rule.required) {
          throw new ConfigurationError(`Missing required configuration key: "${key}"`, {
            key,
            expectedType: rule.type,
            receivedValue: undefined,
          });
        } else {
          continue;
        }
      }

      let parsedValue: unknown = rawValue;

      if (rule.type === 'number') {
        if (typeof rawValue === 'string') {
          const num = Number(rawValue);
          if (isNaN(num)) {
            throw new ConfigurationError(
              `Configuration validation failed for key "${key}": Expected number, received "${rawValue}"`,
              { key, expectedType: 'number', receivedValue: rawValue },
            );
          }
          parsedValue = num;
        } else if (typeof rawValue !== 'number') {
          throw new ConfigurationError(
            `Configuration validation failed for key "${key}": Expected number, received type "${typeof rawValue}"`,
            { key, expectedType: 'number', receivedValue: rawValue },
          );
        }
      } else if (rule.type === 'boolean') {
        if (typeof rawValue === 'string') {
          const lower = rawValue.toLowerCase();
          if (lower === 'true' || lower === '1') {
            parsedValue = true;
          } else if (lower === 'false' || lower === '0') {
            parsedValue = false;
          } else {
            throw new ConfigurationError(
              `Configuration validation failed for key "${key}": Expected boolean, received "${rawValue}"`,
              { key, expectedType: 'boolean', receivedValue: rawValue },
            );
          }
        } else if (typeof rawValue !== 'boolean') {
          throw new ConfigurationError(
            `Configuration validation failed for key "${key}": Expected boolean, received type "${typeof rawValue}"`,
            { key, expectedType: 'boolean', receivedValue: rawValue },
          );
        }
      } else if (rule.type === 'string') {
        if (typeof rawValue !== 'string') {
          throw new ConfigurationError(
            `Configuration validation failed for key "${key}": Expected string, received type "${typeof rawValue}"`,
            { key, expectedType: 'string', receivedValue: rawValue },
          );
        }
      } else if (rule.type === 'enum') {
        if (typeof rawValue !== 'string') {
          throw new ConfigurationError(
            `Configuration validation failed for key "${key}": Expected string enum, received type "${typeof rawValue}"`,
            { key, expectedType: 'enum', receivedValue: rawValue },
          );
        }
        if (rule.enumOptions && !rule.enumOptions.includes(rawValue)) {
          throw new ConfigurationError(
            `Configuration validation failed for key "${key}": Expected one of [${rule.enumOptions.join(', ')}], received "${rawValue}"`,
            { key, expectedType: 'enum', receivedValue: rawValue },
          );
        }
      }

      if (rule.pattern && typeof parsedValue === 'string') {
        if (!rule.pattern.test(parsedValue)) {
          throw new ConfigurationError(
            `Configuration validation failed for key "${key}": Value "${parsedValue}" does not match pattern ${rule.pattern.toString()}`,
            { key, expectedType: rule.type, receivedValue: parsedValue },
          );
        }
      }

      if (rule.customValidator) {
        try {
          rule.customValidator.validate(parsedValue);
        } catch (err: unknown) {
          const original = err instanceof Error ? err.message : String(err);
          throw new ConfigurationError(
            `Configuration validation failed for key "${key}": Custom validation failed: ${original}`,
            { key, expectedType: rule.type, receivedValue: parsedValue },
          );
        }
      }

      result[key] = parsedValue;
    }

    return result;
  }
}
