import { BindingOptions } from './BindingOptions';
import { TypeConverter } from '../converter/TypeConverter';
import { BindingRegistry } from '../registry/BindingRegistry';
import { ValidationPipeline } from '../validator/ValidationPipeline';

export class BindingConfiguration {
  public readonly registry: BindingRegistry;
  public readonly typeConverter: TypeConverter;
  public readonly validationPipeline: ValidationPipeline;

  constructor(options: BindingOptions) {
    this.registry = options.registry;
    this.typeConverter = options.typeConverter;
    this.validationPipeline = options.validationPipeline;
    Object.freeze(this);
  }
}
