import { HttpRequest } from '@coreforge/contracts';

import { BindingConfiguration } from './BindingConfiguration';
import { CustomConverter, TypeConverter } from '../converter/TypeConverter';
import { BindingRegistry } from '../registry/BindingRegistry';
import { BindingSource } from '../registry/BindingSource';
import { ValidationPipeline } from '../validator/ValidationPipeline';
import { ValidationRule } from '../validator/ValidationRule';

export class BindingBuilder {
  private readonly _registry = new BindingRegistry();
  private readonly _typeConverter = new TypeConverter();
  private readonly _validationPipeline = new ValidationPipeline();
  private readonly _customExtractors = new Map<
    BindingSource,
    { extract(request: HttpRequest, name: string): unknown }
  >();

  public registerConverter(type: string, converter: CustomConverter): this {
    this._typeConverter.register(type, converter);
    return this;
  }

  public registerValidator(ruleName: string, rule: ValidationRule): this {
    this._validationPipeline.register(ruleName, rule);
    return this;
  }

  public registerExtractor(
    source: BindingSource,
    extractor: { extract(request: HttpRequest, name: string): unknown },
  ): this {
    this._customExtractors.set(source, extractor);
    return this;
  }

  public get registry(): BindingRegistry {
    return this._registry;
  }

  public get customExtractors(): ReadonlyMap<
    BindingSource,
    { extract(request: HttpRequest, name: string): unknown }
  > {
    return this._customExtractors;
  }

  public build(): BindingConfiguration {
    return new BindingConfiguration({
      registry: this._registry,
      typeConverter: this._typeConverter,
      validationPipeline: this._validationPipeline,
    });
  }
}
