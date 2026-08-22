import { PluginDescriptor } from './PluginDescriptor';
import { PluginRegistry } from './PluginRegistry';
import { PluginValidationError } from '../errors/PluginErrors';

export class PluginRegistryManager {
  private readonly _registry: PluginRegistry;
  private _readOnly = false;

  constructor(registry: PluginRegistry) {
    this._registry = registry;
  }

  public register(desc: PluginDescriptor): void {
    if (this._readOnly) {
      throw new Error('PluginRegistryManager: Registry is read-only after startup.');
    }
    if (this._registry.registered.has(desc.id)) {
      throw new PluginValidationError(
        `PluginRegistryManager: Plugin with ID "${desc.id}" is already registered.`,
      );
    }
    this._registry.registered.add(desc);
  }

  public getRegistered(): readonly PluginDescriptor[] {
    return this._registry.registered.getAll();
  }

  public get(id: string): PluginDescriptor | undefined {
    return this._registry.registered.get(id);
  }

  public has(id: string): boolean {
    return this._registry.registered.has(id);
  }

  public isEnabled(id: string): boolean {
    return this._registry.enabled.has(id);
  }

  public isDisabled(id: string): boolean {
    return this._registry.disabled.has(id);
  }

  public enable(id: string): void {
    this._registry.enabled.add(id);
    this._registry.disabled.delete(id);
  }

  public disable(id: string): void {
    this._registry.disabled.add(id);
    this._registry.enabled.delete(id);
  }

  public makeReadOnly(): void {
    this._readOnly = true;
    Object.freeze(this._registry.registered);
    Object.freeze(this._registry.enabled);
    Object.freeze(this._registry.disabled);
    Object.freeze(this._registry);
    Object.freeze(this);
  }
}
