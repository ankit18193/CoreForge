import { RuntimeController } from '../model/RuntimeController';
import { RuntimeModule } from '../model/RuntimeModule';
import { RuntimeProvider } from '../model/RuntimeProvider';
import { RuntimeRoute } from '../model/RuntimeRoute';

export class RuntimeAssemblyRegistry {
  private readonly _modules = new Map<string, RuntimeModule>();
  private readonly _providers = new Map<string, RuntimeProvider>();
  private readonly _controllers = new Map<string, RuntimeController>();
  private readonly _routes = new Map<string, RuntimeRoute>();
  private readonly _middleware: unknown[] = [];
  private readonly _interceptors: unknown[] = [];
  private readonly _security: unknown[] = [];
  private _ready = false;

  public registerModule(module: RuntimeModule): void {
    if (this._ready) {
      throw new Error('RuntimeAssemblyRegistry: registry is ready/immutable.');
    }
    this._modules.set(module.id, module);
  }

  public registerProvider(provider: RuntimeProvider): void {
    if (this._ready) {
      throw new Error('RuntimeAssemblyRegistry: registry is ready/immutable.');
    }
    this._providers.set(provider.id, provider);
  }

  public registerController(controller: RuntimeController): void {
    if (this._ready) {
      throw new Error('RuntimeAssemblyRegistry: registry is ready/immutable.');
    }
    this._controllers.set(controller.id, controller);
  }

  public registerRoute(route: RuntimeRoute): void {
    if (this._ready) {
      throw new Error('RuntimeAssemblyRegistry: registry is ready/immutable.');
    }
    this._routes.set(route.id, route);
  }

  public registerMiddleware(middleware: unknown): void {
    if (this._ready) {
      throw new Error('RuntimeAssemblyRegistry: registry is ready/immutable.');
    }
    this._middleware.push(middleware);
  }

  public registerInterceptor(interceptor: unknown): void {
    if (this._ready) {
      throw new Error('RuntimeAssemblyRegistry: registry is ready/immutable.');
    }
    this._interceptors.push(interceptor);
  }

  public registerSecurity(security: unknown): void {
    if (this._ready) {
      throw new Error('RuntimeAssemblyRegistry: registry is ready/immutable.');
    }
    this._security.push(security);
  }

  public get modules(): readonly RuntimeModule[] {
    return Array.from(this._modules.values());
  }

  public get providers(): readonly RuntimeProvider[] {
    return Array.from(this._providers.values());
  }

  public get controllers(): readonly RuntimeController[] {
    return Array.from(this._controllers.values());
  }

  public get routes(): readonly RuntimeRoute[] {
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
    this._ready = true;
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
