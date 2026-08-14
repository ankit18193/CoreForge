export class KernelRegistry {
  private readonly _subsystems = new Map<string, unknown>();
  private _readOnly = false;

  public register(id: string, subsystem: unknown): void {
    if (this._readOnly) {
      throw new Error(
        'KernelRegistry: Registry is read-only after reaching READY.',
      );
    }
    if (this._subsystems.has(id)) {
      throw new Error(
        `KernelRegistry: Subsystem with ID "${id}" is already registered.`,
      );
    }
    this._subsystems.set(id, subsystem);
  }

  public get(id: string): unknown | undefined {
    return this._subsystems.get(id);
  }

  public has(id: string): boolean {
    return this._subsystems.has(id);
  }

  public getAll(): readonly unknown[] {
    return Array.from(this._subsystems.values());
  }

  public getKeys(): string[] {
    return Array.from(this._subsystems.keys());
  }

  public makeReadOnly(): void {
    this._readOnly = true;
    Object.freeze(this._subsystems);
    Object.freeze(this);
  }
}
