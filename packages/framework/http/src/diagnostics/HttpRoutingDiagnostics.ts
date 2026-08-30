import { HttpRoutingDiagnosticsSnapshot } from '@coreforge/contracts';

export class HttpRoutingDiagnostics {
  private _totalRouteResolutions = 0;
  private _successfulResolutions = 0;
  private _routeNotFound = 0;
  private _methodNotAllowed = 0;
  private _parameterExtractionFailures = 0;
  private _registrationFailures = 0;
  private _resolutionFailures = 0;
  private _activeResolutions = 0;
  private _totalDurationMs = 0;
  private _slowestResolutionDurationMs = 0;

  public recordResolutionStarted(): void {
    this._totalRouteResolutions++;
    this._activeResolutions++;
  }

  public recordResolutionSuccess(durationMs: number): void {
    if (this._activeResolutions > 0) {
      this._activeResolutions--;
    }
    this._successfulResolutions++;
    this._totalDurationMs += durationMs;
    if (durationMs > this._slowestResolutionDurationMs) {
      this._slowestResolutionDurationMs = durationMs;
    }
  }

  public recordRouteNotFound(durationMs: number): void {
    if (this._activeResolutions > 0) {
      this._activeResolutions--;
    }
    this._routeNotFound++;
    this._resolutionFailures++;
    this._totalDurationMs += durationMs;
    if (durationMs > this._slowestResolutionDurationMs) {
      this._slowestResolutionDurationMs = durationMs;
    }
  }

  public recordMethodNotAllowed(durationMs: number): void {
    if (this._activeResolutions > 0) {
      this._activeResolutions--;
    }
    this._methodNotAllowed++;
    this._resolutionFailures++;
    this._totalDurationMs += durationMs;
    if (durationMs > this._slowestResolutionDurationMs) {
      this._slowestResolutionDurationMs = durationMs;
    }
  }

  public recordParameterExtractionFailure(): void {
    this._parameterExtractionFailures++;
  }

  public recordRegistrationFailure(): void {
    this._registrationFailures++;
  }

  public recordResolutionFailure(durationMs: number): void {
    if (this._activeResolutions > 0) {
      this._activeResolutions--;
    }
    this._resolutionFailures++;
    this._totalDurationMs += durationMs;
    if (durationMs > this._slowestResolutionDurationMs) {
      this._slowestResolutionDurationMs = durationMs;
    }
  }

  public getSnapshot(): HttpRoutingDiagnosticsSnapshot {
    const completedResolutions = this._successfulResolutions + this._resolutionFailures;
    const averageResolutionDurationMs =
      completedResolutions > 0
        ? Number((this._totalDurationMs / completedResolutions).toFixed(3))
        : 0;

    const snapshot: HttpRoutingDiagnosticsSnapshot = {
      totalRouteResolutions: this._totalRouteResolutions,
      successfulResolutions: this._successfulResolutions,
      routeNotFound: this._routeNotFound,
      methodNotAllowed: this._methodNotAllowed,
      parameterExtractionFailures: this._parameterExtractionFailures,
      registrationFailures: this._registrationFailures,
      resolutionFailures: this._resolutionFailures,
      activeResolutions: this._activeResolutions,
      averageResolutionDurationMs,
      slowestResolutionDurationMs: Number(this._slowestResolutionDurationMs.toFixed(3)),
    };

    return Object.freeze(snapshot);
  }

  public reset(): void {
    this._totalRouteResolutions = 0;
    this._successfulResolutions = 0;
    this._routeNotFound = 0;
    this._methodNotAllowed = 0;
    this._parameterExtractionFailures = 0;
    this._registrationFailures = 0;
    this._resolutionFailures = 0;
    this._activeResolutions = 0;
    this._totalDurationMs = 0;
    this._slowestResolutionDurationMs = 0;
  }
}
