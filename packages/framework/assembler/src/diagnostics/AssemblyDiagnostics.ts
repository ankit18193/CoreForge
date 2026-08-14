export interface AssemblyDiagnosticsSnapshot {
  readonly assemblyDurationMs: number;
  readonly plannerDurationMs: number;
  readonly graphConstructionDurationMs: number;
  readonly validationDurationMs: number;
  readonly runtimeModules: number;
  readonly runtimeProviders: number;
  readonly runtimeControllers: number;
  readonly runtimeRoutes: number;
  readonly runtimeMiddleware: number;
  readonly runtimeInterceptors: number;
  readonly runtimeSecurityComponents: number;
  readonly runtimeGraphDepth: number;
  readonly runtimeGraphSize: number;
  readonly cacheHits: number;
  readonly cacheMisses: number;
  readonly validationFailures: number;
}

export class AssemblyDiagnostics {
  private _assemblyTimeMs = 0;
  private _plannerTimeMs = 0;
  private _graphTimeMs = 0;
  private _validationTimeMs = 0;

  private _modules = 0;
  private _providers = 0;
  private _controllers = 0;
  private _routes = 0;
  private _middleware = 0;
  private _interceptors = 0;
  private _security = 0;

  private _graphDepth = 0;
  private _graphSize = 0;

  private _cacheHits = 0;
  private _cacheMisses = 0;
  private _validationFailures = 0;

  public recordTimings(
    assembly: number,
    planner: number,
    graph: number,
    validation: number,
  ): void {
    this._assemblyTimeMs = assembly;
    this._plannerTimeMs = planner;
    this._graphTimeMs = graph;
    this._validationTimeMs = validation;
  }

  public recordCounts(
    modules: number,
    providers: number,
    controllers: number,
    routes: number,
    middleware: number,
    interceptors: number,
    security: number,
  ): void {
    this._modules = modules;
    this._providers = providers;
    this._controllers = controllers;
    this._routes = routes;
    this._middleware = middleware;
    this._interceptors = interceptors;
    this._security = security;
  }

  public recordGraph(size: number, depth: number): void {
    this._graphSize = size;
    this._graphDepth = depth;
  }

  public recordCacheHit(): void {
    this._cacheHits++;
  }

  public recordCacheMiss(): void {
    this._cacheMisses++;
  }

  public recordFailure(): void {
    this._validationFailures++;
  }

  public getSnapshot(): AssemblyDiagnosticsSnapshot {
    return {
      assemblyDurationMs: this._assemblyTimeMs,
      plannerDurationMs: this._plannerTimeMs,
      graphConstructionDurationMs: this._graphTimeMs,
      validationDurationMs: this._validationTimeMs,
      runtimeModules: this._modules,
      runtimeProviders: this._providers,
      runtimeControllers: this._controllers,
      runtimeRoutes: this._routes,
      runtimeMiddleware: this._middleware,
      runtimeInterceptors: this._interceptors,
      runtimeSecurityComponents: this._security,
      runtimeGraphDepth: this._graphDepth,
      runtimeGraphSize: this._graphSize,
      cacheHits: this._cacheHits,
      cacheMisses: this._cacheMisses,
      validationFailures: this._validationFailures,
    };
  }
}
