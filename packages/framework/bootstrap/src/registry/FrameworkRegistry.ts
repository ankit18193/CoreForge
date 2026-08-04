export class FrameworkRegistry {
  private readonly _services = new Map<string, unknown>();

  public set<T>(name: string, service: T): void {
    this._services.set(name, service);
  }

  public get<T>(name: string): T {
    const service = this._services.get(name);
    if (!service) {
      throw new Error(`FrameworkRegistry: service ${name} is not registered.`);
    }
    return service as T;
  }

  public has(name: string): boolean {
    return this._services.has(name);
  }

  public keys(): string[] {
    return Array.from(this._services.keys());
  }
}
