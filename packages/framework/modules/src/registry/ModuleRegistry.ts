import { ModuleDescriptor } from '../descriptors/ModuleDescriptor';
import { ModuleAlreadyRegisteredError } from '../errors/ModuleErrors';

export class ModuleRegistry {
  private _descriptors = new Map<string, ModuleDescriptor>();

  public register(descriptor: ModuleDescriptor): void {
    const name = descriptor.metadata.name;
    if (this._descriptors.has(name)) {
      throw new ModuleAlreadyRegisteredError(`Module "${name}" is already registered.`, { name });
    }
    this._descriptors.set(name, descriptor);
  }

  public get(name: string): ModuleDescriptor | undefined {
    return this._descriptors.get(name);
  }

  public has(name: string): boolean {
    return this._descriptors.has(name);
  }

  public getAll(): ModuleDescriptor[] {
    return Array.from(this._descriptors.values());
  }

  public clear(): void {
    this._descriptors.clear();
  }
}
