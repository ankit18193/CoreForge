import { ComponentDescriptor } from './ComponentDescriptor';
import { ComponentRegistry } from './ComponentRegistry';

export class ComponentDiscovery {
  private readonly _registry: ComponentRegistry;

  constructor(registry: ComponentRegistry) {
    this._registry = registry;
  }

  public discover(type: string): readonly ComponentDescriptor[] {
    return this._registry.list().filter((c) => c.type === type);
  }

  public discoverFirst(type: string): ComponentDescriptor | undefined {
    return this._registry.list().find((c) => c.type === type);
  }
}
