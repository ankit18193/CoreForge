import { AdapterDescriptor } from './AdapterDescriptor';
import { AdapterNotFoundError, DuplicateAdapterError } from '../errors/HttpErrors';

export class AdapterRegistry {
  private readonly _descriptors = new Map<string, AdapterDescriptor>();
  private _activeAdapterName?: string | undefined;

  public register(descriptor: AdapterDescriptor): void {
    if (this._descriptors.has(descriptor.name)) {
      throw new DuplicateAdapterError(`Adapter ${descriptor.name} is already registered.`);
    }
    this._descriptors.set(descriptor.name, descriptor);
    if (!this._activeAdapterName) {
      this._activeAdapterName = descriptor.name;
    }
  }

  public getActive(): AdapterDescriptor {
    if (!this._activeAdapterName) {
      throw new AdapterNotFoundError('No HTTP adapter is registered.');
    }
    const descriptor = this._descriptors.get(this._activeAdapterName);
    if (!descriptor) {
      throw new AdapterNotFoundError(
        `Active adapter descriptor for ${this._activeAdapterName} not found.`,
      );
    }
    return descriptor;
  }

  public setActive(name: string): void {
    if (!this._descriptors.has(name)) {
      throw new AdapterNotFoundError(`Adapter ${name} is not registered.`);
    }
    this._activeAdapterName = name;
  }

  public get(name: string): AdapterDescriptor {
    const descriptor = this._descriptors.get(name);
    if (!descriptor) {
      throw new AdapterNotFoundError(`Adapter ${name} is not registered.`);
    }
    return descriptor;
  }
}
