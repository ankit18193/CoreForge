import { BindingSource } from '../registry/BindingSource';
import { ValidationRule } from '../validator/ValidationRule';

export class BindingMetadata {
  public readonly source: BindingSource;
  public readonly parameterName: string;
  public readonly required: boolean;
  public readonly defaultValue: unknown;
  public readonly targetType: string;
  public readonly validators: readonly ValidationRule[];

  constructor(params: {
    source: BindingSource;
    parameterName: string;
    required?: boolean;
    defaultValue?: unknown;
    targetType: string;
    validators?: ValidationRule[];
  }) {
    this.source = params.source;
    this.parameterName = params.parameterName;
    this.required = params.required ?? false;
    this.defaultValue = params.defaultValue;
    this.targetType = params.targetType;
    this.validators = Object.freeze([...(params.validators || [])]);
    Object.freeze(this);
  }
}
