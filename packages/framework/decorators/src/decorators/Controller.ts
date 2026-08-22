import { DecoratorMetadataFactory } from '../metadata/DecoratorMetadataFactory';
import { MetadataRegistrar } from '../metadata/MetadataRegistrar';
import { Constructor, ControllerOptions } from '../types/decoratorTypes';
import { DecoratorValidator } from '../validation/DecoratorValidator';
import { RouteDecoratorValidator } from '../validation/RouteDecoratorValidator';

export function Controller(prefixOrOptions?: string | ControllerOptions): ClassDecorator {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return function <TFunction extends Function>(target: TFunction): void {
    DecoratorValidator.validateClassTarget(target, 'Controller');

    if (typeof prefixOrOptions === 'string') {
      RouteDecoratorValidator.validatePathSyntax(prefixOrOptions, 'Controller');
    } else if (typeof prefixOrOptions === 'object' && prefixOrOptions !== null) {
      if (prefixOrOptions.path !== undefined) {
        RouteDecoratorValidator.validatePathSyntax(prefixOrOptions.path, 'Controller');
      }
    }

    const metadata = DecoratorMetadataFactory.createControllerMetadata(
      target as unknown as Constructor,
      prefixOrOptions,
    );

    MetadataRegistrar.getCollector().register(metadata);
  };
}
