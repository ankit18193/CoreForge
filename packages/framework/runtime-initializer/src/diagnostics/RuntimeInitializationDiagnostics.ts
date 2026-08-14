export interface RuntimeInitializationDiagnosticsSnapshot {
  readonly plannerDurationMs: number;
  readonly initializationDurationMs: number;
  readonly executorDurationMs: number;
  readonly rollbackDurationMs: number;
  readonly initializedModules: number;
  readonly initializedProviders: number;
  readonly initializedControllers: number;
  readonly initializedRoutes: number;
  readonly initializedMiddleware: number;
  readonly initializedInterceptors: number;
  readonly initializedSecurityComponents: number;
  readonly initializationFailures: number;
  readonly rollbackExecutions: number;
}

export class RuntimeInitializationDiagnostics {
  private _plannerTimeMs = 0;
  private _initTimeMs = 0;
  private _executorTimeMs = 0;
  private _rollbackTimeMs = 0;

  private _modules = 0;
  private _providers = 0;
  private _controllers = 0;
  private _routes = 0;
  private _middleware = 0;
  private _interceptors = 0;
  private _security = 0;

  private _failures = 0;
  private _rollbacks = 0;

  public recordTimings(
    planner: number,
    initialization: number,
    executor: number,
    rollback: number,
  ): void {
    this._plannerTimeMs = planner;
    this._initTimeMs = initialization;
    this._executorTimeMs = executor;
    this._rollbackTimeMs = rollback;
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

  public recordFailure(): void {
    this._failures++;
  }

  public recordRollback(): void {
    this._rollbacks++;
  }

  public getSnapshot(): RuntimeInitializationDiagnosticsSnapshot {
    return {
      plannerDurationMs: this._plannerTimeMs,
      initializationDurationMs: this._initTimeMs,
      executorDurationMs: this._executorTimeMs,
      rollbackDurationMs: this._rollbackTimeMs,
      initializedModules: this._modules,
      initializedProviders: this._providers,
      initializedControllers: this._controllers,
      initializedRoutes: this._routes,
      initializedMiddleware: this._middleware,
      initializedInterceptors: this._interceptors,
      initializedSecurityComponents: this._security,
      initializationFailures: this._failures,
      rollbackExecutions: this._rollbacks,
    };
  }
}
