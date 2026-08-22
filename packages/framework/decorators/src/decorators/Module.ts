import { DecoratorMetadataFactory } from '../metadata/DecoratorMetadataFactory';
import { MetadataRegistrar } from '../metadata/MetadataRegistrar';
import { Constructor, ModuleOptions } from '../types/decoratorTypes';
import { ModuleDecoratorValidator } from '../validation/ModuleDecoratorValidator';

export function Module(options?: ModuleOptions): ClassDecorator {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return function <TFunction extends Function>(target: TFunction): void {
    ModuleDecoratorValidator.validateModuleTarget(target);
    ModuleDecoratorValidator.validateModuleOptions(options);

    const metadata = DecoratorMetadataFactory.createModuleMetadata(
      target as unknown as Constructor,
      options,
    );

    MetadataRegistrar.getCollector().register(metadata);
  };
}
