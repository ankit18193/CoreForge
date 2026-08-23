import { RoutingDiagnosticsSnapshot } from '../types/routingTypes';

export class RoutingDiagnostics {
  private _totalMatches = 0;
  private _successfulMatches = 0;
  private _notFound = 0;
  private _methodNotAllowed = 0;
  private _malformedPaths = 0;
  private _routeConflicts = 0;
  private _totalDurationMs = 0;
  private _slowestDurationMs = 0;
  private readonly _methodDistribution: Record<string, number> = {};
  private readonly _routeIdDistribution: Record<string, number> = {};

  public recordSuccess(routeId: string, method: string, durationMs: number): void {
    this._totalMatches++;
    this._successfulMatches++;
    this._totalDurationMs += durationMs;
    if (durationMs > this._slowestDurationMs) {
      this._slowestDurationMs = durationMs;
    }
    this._methodDistribution[method] = (this._methodDistribution[method] || 0) + 1;
    this._routeIdDistribution[routeId] = (this._routeIdDistribution[routeId] || 0) + 1;
  }

  public recordNotFound(durationMs: number): void {
    this._totalMatches++;
    this._notFound++;
    this._totalDurationMs += durationMs;
  }

  public recordMethodNotAllowed(durationMs: number): void {
    this._totalMatches++;
    this._methodNotAllowed++;
    this._totalDurationMs += durationMs;
  }

  public recordMalformedPath(): void {
    this._malformedPaths++;
  }

  public recordRouteConflict(): void {
    this._routeConflicts++;
  }

  public getSnapshot(): RoutingDiagnosticsSnapshot {
    const avg = this._totalMatches > 0 ? this._totalDurationMs / this._totalMatches : 0;

    return Object.freeze({
      totalMatches: this._totalMatches,
      successfulMatches: this._successfulMatches,
      notFound: this._notFound,
      methodNotAllowed: this._methodNotAllowed,
      malformedPaths: this._malformedPaths,
      routeConflicts: this._routeConflicts,
      averageDurationMs: avg,
      slowestDurationMs: this._slowestDurationMs,
      methodDistribution: Object.freeze({ ...this._methodDistribution }),
      routeIdDistribution: Object.freeze({ ...this._routeIdDistribution }),
      timestamp: Date.now(),
    });
  }

  public reset(): void {
    this._totalMatches = 0;
    this._successfulMatches = 0;
    this._notFound = 0;
    this._methodNotAllowed = 0;
    this._malformedPaths = 0;
    this._routeConflicts = 0;
    this._totalDurationMs = 0;
    this._slowestDurationMs = 0;
    for (const k of Object.keys(this._methodDistribution)) {
      delete this._methodDistribution[k];
    }
    for (const k of Object.keys(this._routeIdDistribution)) {
      delete this._routeIdDistribution[k];
    }
  }
}
