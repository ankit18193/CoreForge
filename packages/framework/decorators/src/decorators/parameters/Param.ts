import { DecoratorMetadataFactory } from '../../metadata/DecoratorMetadataFactory';
import { MetadataRegistrar } from '../../metadata/MetadataRegistrar';
import { BindingDecoratorOptions } from '../../types/decoratorTypes';
import { ParameterDecoratorValidator } from '../../validation/ParameterDecoratorValidator';

export function Param(
  nameOrOptions?: string | BindingDecoratorOptions,
  options?: BindingDecoratorOptions,
): ParameterDecorator {
  const name = typeof nameOrOptions === 'string' ? nameOrOptions : nameOrOptions?.name;
  const required =
    typeof nameOrOptions === 'object' && nameOrOptions?.required !== undefined
      ? nameOrOptions.required
      : (options?.required ?? true);

  return function (
    target: object,
    propertyKey: string | symbol | undefined,
    parameterIndex: number,
  ): void {
    ParameterDecoratorValidator.validateParameter(target, propertyKey, parameterIndex, 'Param');

    const controllerName = target.constructor?.name || 'Unknown';
    const actionName = String(propertyKey);

    const metadata = DecoratorMetadataFactory.createParameterMetadata(
      controllerName,
      actionName,
      {
        name,
        source: 'param',
        index: parameterIndex,
        required,
      },
      target,
    );

    MetadataRegistrar.getCollector().register(metadata);
  };
}
