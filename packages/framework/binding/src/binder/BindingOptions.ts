import { TypeConverter } from '../converter/TypeConverter';
import { BindingRegistry } from '../registry/BindingRegistry';
import { ValidationPipeline } from '../validator/ValidationPipeline';

export interface BindingOptions {
  readonly registry: BindingRegistry;
  readonly typeConverter: TypeConverter;
  readonly validationPipeline: ValidationPipeline;
}
