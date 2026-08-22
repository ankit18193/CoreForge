import { DecoratorMetadataFactory } from '../metadata/DecoratorMetadataFactory';
import { MetadataRegistrar } from '../metadata/MetadataRegistrar';
import { DecoratorValidator } from '../validation/DecoratorValidator';

export function Guard(guard: unknown | readonly unknown[]): ClassDecorator & MethodDecorator {
  return function <T>(
    target: object,
    propertyKey?: string | symbol,
    _descriptor?: TypedPropertyDescriptor<T>,
  ): void {
    DecoratorValidator.validateTarget(target, 'Guard');

    const targetName =
      typeof target === 'function' ? target.name : target.constructor?.name || 'Unknown';

    const guardList = Array.isArray(guard) ? guard : [guard];

    for (const g of guardList) {
      const metadata = DecoratorMetadataFactory.createGuardMetadata(
        targetName,
        g,
        propertyKey,
        target,
      );
      MetadataRegistrar.getCollector().register(metadata);
    }
  };
}
