import { ApplicationModel } from '../model/ApplicationModel';

export class CompilationCache {
  private _cachedModel: ApplicationModel | undefined = undefined;
  private readonly _routeCache = new Map<string, unknown>();
  private readonly _providerCache = new Map<string, unknown>();

  public getModel(): ApplicationModel | undefined {
    return this._cachedModel;
  }

  public cacheModel(model: ApplicationModel): void {
    this._cachedModel = model;
  }

  public getRouteCache(key: string): unknown | undefined {
    return this._routeCache.get(key);
  }

  public setRouteCache(key: string, value: unknown): void {
    this._routeCache.set(key, value);
  }

  public getProviderCache(key: string): unknown | undefined {
    return this._providerCache.get(key);
  }

  public setProviderCache(key: string, value: unknown): void {
    this._providerCache.set(key, value);
  }

  public clear(): void {
    this._cachedModel = undefined;
    this._routeCache.clear();
    this._providerCache.clear();
  }
}
