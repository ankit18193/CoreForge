import { ValidationErrorCollection } from './ValidationErrorCollection';
import { ValidationRule } from './ValidationRule';

export class ValidationPipeline {
  private readonly _customValidators = new Map<string, ValidationRule>();

  public register(ruleName: string, rule: ValidationRule): void {
    this._customValidators.set(ruleName.toLowerCase(), rule);
  }

  public validate(
    value: unknown,
    path: string,
    metadata: {
      required?: boolean;
      targetType?: string;
      min?: number;
      max?: number;
      pattern?: RegExp;
      customRule?: (value: unknown) => boolean | Promise<boolean>;
    },
    collection: ValidationErrorCollection,
  ): void {
    if (metadata.required) {
      if (
        value === undefined ||
        value === null ||
        (typeof value === 'string' && value.trim() === '')
      ) {
        collection.addError(path, `Parameter "${path}" is required.`, 'required');
        return;
      }
    } else {
      if (value === undefined || value === null) {
        return;
      }
    }

    if (metadata.targetType) {
      const type = metadata.targetType.toLowerCase();
      if (type === 'number' && typeof value !== 'number') {
        collection.addError(path, `Value must be a number.`, 'type');
      } else if (type === 'boolean' && typeof value !== 'boolean') {
        collection.addError(path, `Value must be a boolean.`, 'type');
      } else if (type === 'date' && !(value instanceof Date)) {
        collection.addError(path, `Value must be a Date.`, 'type');
      } else if (type === 'bigint' && typeof value !== 'bigint') {
        collection.addError(path, `Value must be a bigint.`, 'type');
      }
    }

    if (typeof value === 'number') {
      if (metadata.min !== undefined && value < metadata.min) {
        collection.addError(path, `Value must be at least ${metadata.min}.`, 'range');
      }
      if (metadata.max !== undefined && value > metadata.max) {
        collection.addError(path, `Value must be at most ${metadata.max}.`, 'range');
      }
    }

    if (typeof value === 'string' && metadata.pattern) {
      if (!metadata.pattern.test(value)) {
        collection.addError(path, `Value does not match required pattern.`, 'pattern');
      }
    }

    if (metadata.customRule) {
      const res = metadata.customRule(value);
      if (res === false) {
        collection.addError(path, `Value failed custom validation rule.`, 'custom');
      }
    }

    for (const [name, validator] of this._customValidators.entries()) {
      const res = validator.validate(value, path);
      if (!res.valid) {
        if (res.isWarning) {
          collection.addWarning(path, res.message || `Warning on rule ${name}`);
        } else {
          collection.addError(path, res.message || `Failed rule ${name}`, name);
        }
      }
    }
  }
}
