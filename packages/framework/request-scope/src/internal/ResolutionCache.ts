export class ResolutionCache {
  private readonly _instances = new Map<unknown, unknown>();
  private readonly _creationOrder: unknown[] = [];

  public has(token: unknown): boolean {
    return this._instances.has(token);
  }

  public get(token: unknown): unknown | undefined {
    return this._instances.get(token);
  }

  public set(token: unknown, instance: unknown): void {
    if (!this._instances.has(token)) {
      this._creationOrder.push(instance);
    }
    this._instances.set(token, instance);
  }

  public getInstancesInCreationOrder(): readonly unknown[] {
    return Object.freeze([...this._creationOrder]);
  }

  public clear(): void {
    this._instances.clear();
    this._creationOrder.length = 0;
  }
}
