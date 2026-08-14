export class RuntimeExecutionRegistry {
  private readonly _activeComponents = new Map<string, unknown>();
  private _readOnly = false;

  public register(id: string, component: unknown): void {
    if (this._readOnly) {
      throw new Error(
        'RuntimeExecutionRegistry: Registry is read-only after runtime starts RUNNING.',
      );
    }
    this._activeComponents.set(id, component);
  }

  public unregister(id: string): void {
    if (this._readOnly) {
      throw new Error(
        'RuntimeExecutionRegistry: Registry is read-only after runtime starts RUNNING.',
      );
    }
    this._activeComponents.delete(id);
  }

  public has(id: string): boolean {
    return this._activeComponents.has(id);
  }

  public get(id: string): unknown | undefined {
    return this._activeComponents.get(id);
  }

  public getActiveComponents(): readonly unknown[] {
    return Array.from(this._activeComponents.values());
  }

  public makeReadOnly(): void {
    this._readOnly = true;
    Object.freeze(this._activeComponents);
    Object.freeze(this);
  }
}
