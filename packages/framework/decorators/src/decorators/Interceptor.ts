import { DecoratorMetadataFactory } from '../metadata/DecoratorMetadataFactory';
import { MetadataRegistrar } from '../metadata/MetadataRegistrar';
import { InterceptorOptions } from '../types/decoratorTypes';
import { DecoratorValidator } from '../validation/DecoratorValidator';

export function Interceptor(
  interceptor: unknown | readonly unknown[],
  options?: InterceptorOptions,
): ClassDecorator & MethodDecorator {
  return function <T>(
    target: object,
    propertyKey?: string | symbol,
    _descriptor?: TypedPropertyDescriptor<T>,
  ): void {
    DecoratorValidator.validateTarget(target, 'Interceptor');

    const targetName =
      typeof target === 'function' ? target.name : target.constructor?.name || 'Unknown';

    const interceptorList = Array.isArray(interceptor) ? interceptor : [interceptor];

    for (const int of interceptorList) {
      const metadata = DecoratorMetadataFactory.createInterceptorMetadata(
        targetName,
        int,
        options,
        propertyKey,
        target,
      );
      MetadataRegistrar.getCollector().register(metadata);
    }
  };
}
