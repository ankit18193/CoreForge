import { DecoratorMetadataFactory } from '../metadata/DecoratorMetadataFactory';
import { MetadataRegistrar } from '../metadata/MetadataRegistrar';
import { MiddlewareOptions } from '../types/decoratorTypes';
import { DecoratorValidator } from '../validation/DecoratorValidator';

export function Middleware(
  middleware: unknown | readonly unknown[],
  options?: MiddlewareOptions,
): ClassDecorator & MethodDecorator {
  return function <T>(
    target: object,
    propertyKey?: string | symbol,
    _descriptor?: TypedPropertyDescriptor<T>,
  ): void {
    DecoratorValidator.validateTarget(target, 'Middleware');

    const targetName =
      typeof target === 'function' ? target.name : target.constructor?.name || 'Unknown';

    const middlewareList = Array.isArray(middleware) ? middleware : [middleware];

    for (const mw of middlewareList) {
      const metadata = DecoratorMetadataFactory.createMiddlewareMetadata(
        targetName,
        mw,
        options,
        propertyKey,
        target,
      );
      MetadataRegistrar.getCollector().register(metadata);
    }
  };
}
