import { DecoratorMetadataFactory } from '../metadata/DecoratorMetadataFactory';
import { MetadataRegistrar } from '../metadata/MetadataRegistrar';
import { Constructor, InjectableOptions } from '../types/decoratorTypes';
import { DecoratorValidator } from '../validation/DecoratorValidator';

export function Injectable(options?: InjectableOptions): ClassDecorator {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return function <TFunction extends Function>(target: TFunction): void {
    DecoratorValidator.validateClassTarget(target, 'Injectable');

    const metadata = DecoratorMetadataFactory.createProviderMetadata(
      target as unknown as Constructor,
      options,
    );

    MetadataRegistrar.getCollector().register(metadata);
  };
}

export function Inject(
  token: unknown,
): (target: object, propertyKey: string | symbol, parameterIndex?: number) => void {
  return function (target: object, propertyKey: string | symbol, parameterIndex?: number): void {
    DecoratorValidator.validateTarget(target, 'Inject');

    const targetName =
      typeof target === 'function' ? target.name : target.constructor?.name || 'Unknown';

    if (typeof parameterIndex === 'number') {
      const metadata = DecoratorMetadataFactory.createPropertyInjectionMetadata(
        targetName,
        `${String(propertyKey || 'constructor')}[${parameterIndex}]`,
        token,
        target,
      );
      MetadataRegistrar.getCollector().register(metadata);
    } else {
      const metadata = DecoratorMetadataFactory.createPropertyInjectionMetadata(
        targetName,
        propertyKey,
        token,
        target,
      );
      MetadataRegistrar.getCollector().register(metadata);
    }
  };
}
