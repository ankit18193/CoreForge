import { IConfigurationSchema, ConfigurationValidationRule } from '../types/configurationTypes';

export class ConfigurationSchema<T = Record<string, unknown>> implements IConfigurationSchema<T> {
  private readonly _rules: Map<string, ConfigurationValidationRule> = new Map();
  private readonly _customValidator?: ((value: unknown) => T) | undefined;

  constructor(customValidator?: (value: unknown) => T) {
    this._customValidator = customValidator;
  }

  public addRule(rule: ConfigurationValidationRule): this {
    this._rules.set(rule.path, rule);
    return this;
  }

  public addField(
    path: string,
    options: Omit<ConfigurationValidationRule, 'path'> & {
      enumOptions?: readonly unknown[];
    } = {},
  ): this {
    const { enumOptions, ...rest } = options;
    const rule: ConfigurationValidationRule = {
      path,
      ...rest,
      enumValues: enumOptions || rest.enumValues,
    };
    this._rules.set(path, rule);
    return this;
  }

  public get rules(): readonly ConfigurationValidationRule[] {
    return Array.from(this._rules.values());
  }

  public validate(value: unknown): T {
    if (this._customValidator) {
      return this._customValidator(value);
    }
    return value as T;
  }
}
