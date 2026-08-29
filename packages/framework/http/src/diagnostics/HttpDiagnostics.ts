import { HttpDiagnosticsSnapshot } from '@coreforge/contracts';

export class HttpDiagnostics {
  private _totalRequests = 0;
  private _successfulRequests = 0;
  private _failedRequests = 0;
  private _cancelledRequests = 0;
  private _activeRequests = 0;
  private _validationFailures = 0;
  private _mappingFailures = 0;
  private _responseMappings = 0;
  private _totalDurationMs = 0;
  private _slowestDurationMs = 0;

  public recordRequestStarted(): void {
    this._totalRequests++;
    this._activeRequests++;
  }

  public recordValidationFailure(): void {
    this._validationFailures++;
  }

  public recordMappingFailure(): void {
    this._mappingFailures++;
  }

  public recordResponseMapping(): void {
    this._responseMappings++;
  }

  public recordRequestSuccess(durationMs: number): void {
    this._successfulRequests++;
    this._activeRequests = Math.max(0, this._activeRequests - 1);
    this._updateDurations(durationMs);
  }

  public recordRequestFailure(durationMs: number, isCancelled = false): void {
    if (isCancelled) {
      this._cancelledRequests++;
    } else {
      this._failedRequests++;
    }
    this._activeRequests = Math.max(0, this._activeRequests - 1);
    this._updateDurations(durationMs);
  }

  private _updateDurations(durationMs: number): void {
    this._totalDurationMs += durationMs;
    if (durationMs > this._slowestDurationMs) {
      this._slowestDurationMs = durationMs;
    }
  }

  public getSnapshot(): HttpDiagnosticsSnapshot {
    const completed = this._successfulRequests + this._failedRequests + this._cancelledRequests;
    const averageDurationMs =
      completed > 0 ? Math.round((this._totalDurationMs / completed) * 100) / 100 : 0;

    const snapshot: HttpDiagnosticsSnapshot = {
      totalRequests: this._totalRequests,
      successfulRequests: this._successfulRequests,
      failedRequests: this._failedRequests,
      cancelledRequests: this._cancelledRequests,
      activeRequests: this._activeRequests,
      validationFailures: this._validationFailures,
      mappingFailures: this._mappingFailures,
      responseMappings: this._responseMappings,
      averageDurationMs,
      slowestDurationMs: Math.round(this._slowestDurationMs * 100) / 100,
    };

    return Object.freeze(snapshot);
  }

  public reset(): void {
    this._totalRequests = 0;
    this._successfulRequests = 0;
    this._failedRequests = 0;
    this._cancelledRequests = 0;
    this._activeRequests = 0;
    this._validationFailures = 0;
    this._mappingFailures = 0;
    this._responseMappings = 0;
    this._totalDurationMs = 0;
    this._slowestDurationMs = 0;
  }
}
