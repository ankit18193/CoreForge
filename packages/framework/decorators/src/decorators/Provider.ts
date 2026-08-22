import { DecoratorMetadataFactory } from '../metadata/DecoratorMetadataFactory';
import { MetadataRegistrar } from '../metadata/MetadataRegistrar';
import { Constructor, ProviderOptions } from '../types/decoratorTypes';
import { DecoratorValidator } from '../validation/DecoratorValidator';

export function Provider(options?: ProviderOptions): ClassDecorator {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return function <TFunction extends Function>(target: TFunction): void {
    DecoratorValidator.validateClassTarget(target, 'Provider');

    const metadata = DecoratorMetadataFactory.createProviderMetadata(
      target as unknown as Constructor,
      options,
    );

    MetadataRegistrar.getCollector().register(metadata);
  };
}
