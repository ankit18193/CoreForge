import { TransportDiagnosticsSnapshot } from '@coreforge/contracts';

export class TransportDiagnostics {
  private _adapterRegistrations = 0;
  private _registrationFailures = 0;
  private _totalRequests = 0;
  private _successfulRequests = 0;
  private _failedRequests = 0;
  private _cancelledRequests = 0;
  private _activeRequests = 0;
  private _adapterResolutions = 0;
  private _resolutionFailures = 0;
  private _totalDurationMs = 0;
  private _slowestDurationMs = 0;

  public recordAdapterRegistration(): void {
    this._adapterRegistrations++;
  }

  public recordRegistrationFailure(): void {
    this._registrationFailures++;
  }

  public recordRequestStarted(): void {
    this._totalRequests++;
    this._activeRequests++;
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

  public recordAdapterResolution(): void {
    this._adapterResolutions++;
  }

  public recordResolutionFailure(): void {
    this._resolutionFailures++;
  }

  private _updateDurations(durationMs: number): void {
    this._totalDurationMs += durationMs;
    if (durationMs > this._slowestDurationMs) {
      this._slowestDurationMs = durationMs;
    }
  }

  public getSnapshot(): TransportDiagnosticsSnapshot {
    const completed = this._successfulRequests + this._failedRequests + this._cancelledRequests;
    const averageDurationMs =
      completed > 0 ? Math.round((this._totalDurationMs / completed) * 100) / 100 : 0;

    const snapshot: TransportDiagnosticsSnapshot = {
      adapterRegistrations: this._adapterRegistrations,
      registrationFailures: this._registrationFailures,
      totalRequests: this._totalRequests,
      successfulRequests: this._successfulRequests,
      failedRequests: this._failedRequests,
      cancelledRequests: this._cancelledRequests,
      activeRequests: this._activeRequests,
      adapterResolutions: this._adapterResolutions,
      resolutionFailures: this._resolutionFailures,
      averageDurationMs,
      slowestDurationMs: Math.round(this._slowestDurationMs * 100) / 100,
    };

    return Object.freeze(snapshot);
  }

  public reset(): void {
    this._adapterRegistrations = 0;
    this._registrationFailures = 0;
    this._totalRequests = 0;
    this._successfulRequests = 0;
    this._failedRequests = 0;
    this._cancelledRequests = 0;
    this._activeRequests = 0;
    this._adapterResolutions = 0;
    this._resolutionFailures = 0;
    this._totalDurationMs = 0;
    this._slowestDurationMs = 0;
  }
}
