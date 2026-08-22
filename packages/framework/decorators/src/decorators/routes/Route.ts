import { RouteMethod } from '@coreforge/contracts';

import { DecoratorMetadataFactory } from '../../metadata/DecoratorMetadataFactory';
import { MetadataRegistrar } from '../../metadata/MetadataRegistrar';
import { RouteDecoratorValidator } from '../../validation/RouteDecoratorValidator';

export function Route(method: RouteMethod | string, path = '/'): MethodDecorator {
  return function <T>(
    target: object,
    propertyKey: string | symbol,
    _descriptor: TypedPropertyDescriptor<T>,
  ): void {
    RouteDecoratorValidator.validateMethodDecorator(target, propertyKey, 'Route');
    RouteDecoratorValidator.validatePathSyntax(path, 'Route');
    RouteDecoratorValidator.validateMethod(method, 'Route');

    const controllerName = target.constructor?.name || 'Unknown';
    const actionName = String(propertyKey);

    const actionMetadata = DecoratorMetadataFactory.createActionMetadata(
      controllerName,
      actionName,
      target,
    );
    MetadataRegistrar.getCollector().register(actionMetadata);

    const routeMetadata = DecoratorMetadataFactory.createRouteMetadata(
      controllerName,
      actionName,
      method,
      path,
      target,
    );
    MetadataRegistrar.getCollector().register(routeMetadata);
  };
}
