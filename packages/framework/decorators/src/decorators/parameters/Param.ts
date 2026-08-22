import { DecoratorMetadataFactory } from '../../metadata/DecoratorMetadataFactory';
import { MetadataRegistrar } from '../../metadata/MetadataRegistrar';
import { ParameterDecoratorValidator } from '../../validation/ParameterDecoratorValidator';

export function Param(name?: string): ParameterDecorator {
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
      },
      target,
    );

    MetadataRegistrar.getCollector().register(metadata);
  };
}
