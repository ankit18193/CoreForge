export interface RouterDiagnosticsSnapshot {
  readonly totalRoutes: number;
  readonly staticRoutes: number;
  readonly parameterRoutes: number;
  readonly wildcardRoutes: number;
  readonly lookupCount: number;
  readonly averageLookupTime: number;
  readonly slowestLookup: number;
  readonly routeCompilationTime: number;
}

export class RouterDiagnostics {
  private _lookupCount = 0;
  private _totalLookupTime = 0;
  private _slowestLookup = 0;
  private _routeCompilationTime = 0;

  private _totalRoutes = 0;
  private _staticRoutes = 0;
  private _parameterRoutes = 0;
  private _wildcardRoutes = 0;

  public addCompilationTime(ms: number): void {
    this._routeCompilationTime += ms;
  }

  public recordRouteAdded(type: 'STATIC' | 'PARAMETER' | 'WILDCARD'): void {
    this._totalRoutes++;
    if (type === 'STATIC') {
      this._staticRoutes++;
    } else if (type === 'PARAMETER') {
      this._parameterRoutes++;
    } else {
      this._wildcardRoutes++;
    }
  }

  public recordLookup(durationMs: number): void {
    this._lookupCount++;
    this._totalLookupTime += durationMs;
    if (durationMs > this._slowestLookup) {
      this._slowestLookup = durationMs;
    }
  }

  public getSnapshot(): RouterDiagnosticsSnapshot {
    const avg = this._lookupCount > 0 ? this._totalLookupTime / this._lookupCount : 0;
    return {
      totalRoutes: this._totalRoutes,
      staticRoutes: this._staticRoutes,
      parameterRoutes: this._parameterRoutes,
      wildcardRoutes: this._wildcardRoutes,
      lookupCount: this._lookupCount,
      averageLookupTime: avg,
      slowestLookup: this._slowestLookup,
      routeCompilationTime: this._routeCompilationTime,
    };
  }
}
