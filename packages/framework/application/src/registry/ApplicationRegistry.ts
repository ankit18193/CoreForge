export class ApplicationRegistry {
  private readonly _routes: string[] = [];
  private readonly _modules: string[] = [];
  private readonly _controllers: string[] = [];
  private readonly _serializers: string[] = [];
  private readonly _interceptors: string[] = [];
  private readonly _authProviders: string[] = [];
  private readonly _events: string[] = [];
  private readonly _services: string[] = [];

  public registerRoute(path: string): void {
    this._routes.push(path);
  }

  public registerModule(name: string): void {
    this._modules.push(name);
  }

  public registerController(name: string): void {
    this._controllers.push(name);
  }

  public registerSerializer(name: string): void {
    this._serializers.push(name);
  }

  public registerInterceptor(name: string): void {
    this._interceptors.push(name);
  }

  public registerAuthProvider(name: string): void {
    this._authProviders.push(name);
  }

  public registerEvent(name: string): void {
    this._events.push(name);
  }

  public registerService(name: string): void {
    this._services.push(name);
  }

  public get routes(): readonly string[] {
    return this._routes;
  }

  public get modules(): readonly string[] {
    return this._modules;
  }

  public get controllers(): readonly string[] {
    return this._controllers;
  }

  public get serializers(): readonly string[] {
    return this._serializers;
  }

  public get interceptors(): readonly string[] {
    return this._interceptors;
  }

  public get authProviders(): readonly string[] {
    return this._authProviders;
  }

  public get events(): readonly string[] {
    return this._events;
  }

  public get services(): readonly string[] {
    return this._services;
  }

  public freeze(): void {
    Object.freeze(this._routes);
    Object.freeze(this._modules);
    Object.freeze(this._controllers);
    Object.freeze(this._serializers);
    Object.freeze(this._interceptors);
    Object.freeze(this._authProviders);
    Object.freeze(this._events);
    Object.freeze(this._services);
    Object.freeze(this);
  }
}
