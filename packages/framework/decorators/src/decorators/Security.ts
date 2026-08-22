import { DecoratorMetadataFactory } from '../metadata/DecoratorMetadataFactory';
import { MetadataRegistrar } from '../metadata/MetadataRegistrar';
import { SecurityOptions } from '../types/decoratorTypes';
import { DecoratorValidator } from '../validation/DecoratorValidator';

export function Security(
  options: SecurityOptions | string | readonly string[],
): ClassDecorator & MethodDecorator {
  return function <T>(
    target: object,
    propertyKey?: string | symbol,
    _descriptor?: TypedPropertyDescriptor<T>,
  ): void {
    DecoratorValidator.validateTarget(target, 'Security');

    const targetName =
      typeof target === 'function' ? target.name : target.constructor?.name || 'Unknown';

    let securityOptions: SecurityOptions;
    if (typeof options === 'string') {
      securityOptions = { roles: [options] };
    } else if (Array.isArray(options)) {
      securityOptions = { roles: options as readonly string[] };
    } else {
      securityOptions = options as SecurityOptions;
    }

    const metadata = DecoratorMetadataFactory.createSecurityMetadata(
      targetName,
      securityOptions,
      propertyKey,
      target,
    );

    MetadataRegistrar.getCollector().register(metadata);
  };
}
