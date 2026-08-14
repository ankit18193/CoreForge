export class RuntimeRegistry {
  private readonly _modules = new Map<string, unknown>();
  private readonly _providers = new Map<string, unknown>();
  private readonly _controllers = new Map<string, unknown>();
  private readonly _routes = new Map<string, unknown>();
  private readonly _middleware: unknown[] = [];
  private readonly _interceptors: unknown[] = [];
  private readonly _security: unknown[] = [];
  private _immutable = false;

  public registerModule(id: string, instance: unknown): void {
    if (this._immutable) {
      throw new Error('RuntimeRegistry: registry is ready/immutable.');
    }
    this._modules.set(id, instance);
  }

  public registerProvider(id: string, instance: unknown): void {
    if (this._immutable) {
      throw new Error('RuntimeRegistry: registry is ready/immutable.');
    }
    this._providers.set(id, instance);
  }

  public registerController(id: string, instance: unknown): void {
    if (this._immutable) {
      throw new Error('RuntimeRegistry: registry is ready/immutable.');
    }
    this._controllers.set(id, instance);
  }

  public registerRoute(id: string, instance: unknown): void {
    if (this._immutable) {
      throw new Error('RuntimeRegistry: registry is ready/immutable.');
    }
    this._routes.set(id, instance);
  }

  public registerMiddleware(instance: unknown): void {
    if (this._immutable) {
      throw new Error('RuntimeRegistry: registry is ready/immutable.');
    }
    this._middleware.push(instance);
  }

  public registerInterceptor(instance: unknown): void {
    if (this._immutable) {
      throw new Error('RuntimeRegistry: registry is ready/immutable.');
    }
    this._interceptors.push(instance);
  }

  public registerSecurity(instance: unknown): void {
    if (this._immutable) {
      throw new Error('RuntimeRegistry: registry is ready/immutable.');
    }
    this._security.push(instance);
  }

  public get modules(): readonly unknown[] {
    return Array.from(this._modules.values());
  }

  public get providers(): readonly unknown[] {
    return Array.from(this._providers.values());
  }

  public get controllers(): readonly unknown[] {
    return Array.from(this._controllers.values());
  }

  public get routes(): readonly unknown[] {
    return Array.from(this._routes.values());
  }

  public get middleware(): readonly unknown[] {
    return this._middleware;
  }

  public get interceptors(): readonly unknown[] {
    return this._interceptors;
  }

  public get security(): readonly unknown[] {
    return this._security;
  }

  public makeReady(): void {
    this._immutable = true;
    Object.freeze(this._modules);
    Object.freeze(this._providers);
    Object.freeze(this._controllers);
    Object.freeze(this._routes);
    Object.freeze(this._middleware);
    Object.freeze(this._interceptors);
    Object.freeze(this._security);
    Object.freeze(this);
  }
}
