import { ScopeDescriptor } from './ScopeDescriptor';

export class ScopeRegistry {
  private readonly _scopes = new Map<string, ScopeDescriptor>();
  private _peakConcurrent = 0;

  public register(descriptor: ScopeDescriptor): void {
    this._scopes.set(descriptor.id, descriptor);
    if (this._scopes.size > this._peakConcurrent) {
      this._peakConcurrent = this._scopes.size;
    }
  }

  public unregister(id: string): void {
    this._scopes.delete(id);
  }

  public get(id: string): ScopeDescriptor | undefined {
    return this._scopes.get(id);
  }

  public get activeScopesCount(): number {
    return this._scopes.size;
  }

  public get peakConcurrentScopes(): number {
    return this._peakConcurrent;
  }

  public getActiveScopes(): readonly ScopeDescriptor[] {
    return Object.freeze([...this._scopes.values()]);
  }
}
