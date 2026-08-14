import { ExtensionDescriptor } from './ExtensionDescriptor';
import { ExtensionIndex } from './ExtensionIndex';

export class ExtensionRegistry {
  private readonly _registered = new ExtensionIndex();
  private readonly _enabled = new Set<string>();
  private readonly _disabled = new Set<string>();
  private _readOnly = false;

  public register(desc: ExtensionDescriptor): void {
    if (this._readOnly) {
      throw new Error('ExtensionRegistry: Registry is read-only after startup.');
    }
    this._registered.add(desc);
  }

  public getRegistered(): readonly ExtensionDescriptor[] {
    return this._registered.getAll();
  }

  public get(id: string): ExtensionDescriptor | undefined {
    return this._registered.get(id);
  }

  public has(id: string): boolean {
    return this._registered.has(id);
  }

  public isEnabled(id: string): boolean {
    return this._enabled.has(id);
  }

  public isDisabled(id: string): boolean {
    return this._disabled.has(id);
  }

  public enable(id: string): void {
    this._enabled.add(id);
    this._disabled.delete(id);
  }

  public disable(id: string): void {
    this._disabled.add(id);
    this._enabled.delete(id);
  }

  public makeReadOnly(): void {
    this._readOnly = true;
    Object.freeze(this._registered);
    Object.freeze(this._enabled);
    Object.freeze(this._disabled);
    Object.freeze(this);
  }
}
