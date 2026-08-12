import { ComponentDescriptor } from './ComponentDescriptor';

export class ComponentRegistry {
  private readonly _components: Map<string, ComponentDescriptor> = new Map();

  public register(descriptor: ComponentDescriptor): void {
    this._components.set(descriptor.id, descriptor);
  }

  public get(id: string): ComponentDescriptor | undefined {
    return this._components.get(id);
  }

  public has(id: string): boolean {
    return this._components.has(id);
  }

  public list(): readonly ComponentDescriptor[] {
    return Array.from(this._components.values());
  }

  public clear(): void {
    this._components.clear();
  }
}
