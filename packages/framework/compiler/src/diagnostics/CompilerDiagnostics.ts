export interface CompilerDiagnosticsSnapshot {
  readonly compilationDurationMs: number;
  readonly optimizationDurationMs: number;
  readonly validationDurationMs: number;
  readonly compiledModules: number;
  readonly compiledProviders: number;
  readonly compiledControllers: number;
  readonly compiledRoutes: number;
  readonly compiledMiddleware: number;
  readonly compiledInterceptors: number;
  readonly dependencyGraphSize: number;
  readonly optimizationSavings: number;
  readonly validationFailures: number;
}

export class CompilerDiagnostics {
  private _compilationTimeMs = 0;
  private _optimizationTimeMs = 0;
  private _validationTimeMs = 0;

  private _compiledModules = 0;
  private _compiledProviders = 0;
  private _compiledControllers = 0;
  private _compiledRoutes = 0;
  private _compiledMiddleware = 0;
  private _compiledInterceptors = 0;

  private _graphSize = 0;
  private _optimizationSavings = 0;
  private _validationFailures = 0;

  public recordTimings(compilation: number, optimization: number, validation: number): void {
    this._compilationTimeMs = compilation;
    this._optimizationTimeMs = optimization;
    this._validationTimeMs = validation;
  }

  public recordCounts(
    modules: number,
    providers: number,
    controllers: number,
    routes: number,
    middleware: number,
    interceptors: number,
  ): void {
    this._compiledModules = modules;
    this._compiledProviders = providers;
    this._compiledControllers = controllers;
    this._compiledRoutes = routes;
    this._compiledMiddleware = middleware;
    this._compiledInterceptors = interceptors;
  }

  public recordSavings(savings: number): void {
    this._optimizationSavings = savings;
  }

  public recordGraphMetrics(size: number): void {
    this._graphSize = size;
  }

  public recordFailure(): void {
    this._validationFailures++;
  }

  public getSnapshot(): CompilerDiagnosticsSnapshot {
    return {
      compilationDurationMs: this._compilationTimeMs,
      optimizationDurationMs: this._optimizationTimeMs,
      validationDurationMs: this._validationTimeMs,
      compiledModules: this._compiledModules,
      compiledProviders: this._compiledProviders,
      compiledControllers: this._compiledControllers,
      compiledRoutes: this._compiledRoutes,
      compiledMiddleware: this._compiledMiddleware,
      compiledInterceptors: this._compiledInterceptors,
      dependencyGraphSize: this._graphSize,
      optimizationSavings: this._optimizationSavings,
      validationFailures: this._validationFailures,
    };
  }
}
