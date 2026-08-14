import { KernelRegistry } from './KernelRegistry';

export class KernelIndex {
  private readonly _registry: KernelRegistry;

  constructor(registry: KernelRegistry) {
    this._registry = registry;
  }

  public lookup(id: string): unknown | undefined {
    return this._registry.get(id);
  }
}
