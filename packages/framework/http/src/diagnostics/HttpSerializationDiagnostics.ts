import type { HttpResponseDiagnosticsSnapshot } from '@coreforge/contracts';

export class HttpSerializationDiagnostics {
  private _totalSerializations = 0;
  private _successfulSerializations = 0;
  private _failedSerializations = 0;
  private _cancelledSerializations = 0;
  private _timeoutSerializations = 0;
  private _activeSerializations = 0;
  private _transformationFailures = 0;
  private _serializerResolutionFailures = 0;
  private _totalDurationMs = 0;
  private _slowestDurationMs = 0;

  public recordSerializationStarted(): void {
    this._totalSerializations++;
    this._activeSerializations++;
  }

  public recordSerializationSuccess(durationMs: number): void {
    if (this._activeSerializations > 0) {
      this._activeSerializations--;
    }
    this._successfulSerializations++;
    this._totalDurationMs += durationMs;
    if (durationMs > this._slowestDurationMs) {
      this._slowestDurationMs = durationMs;
    }
  }

  public recordSerializationFailure(
    durationMs: number,
    isCancelled = false,
    isTimeout = false,
  ): void {
    if (this._activeSerializations > 0) {
      this._activeSerializations--;
    }
    this._failedSerializations++;
    if (isCancelled) {
      this._cancelledSerializations++;
    }
    if (isTimeout) {
      this._timeoutSerializations++;
    }
    this._totalDurationMs += durationMs;
    if (durationMs > this._slowestDurationMs) {
      this._slowestDurationMs = durationMs;
    }
  }

  public recordTransformationFailure(): void {
    this._transformationFailures++;
  }

  public recordResolutionFailure(): void {
    this._serializerResolutionFailures++;
  }

  public getSnapshot(): HttpResponseDiagnosticsSnapshot {
    const completedCount = this._successfulSerializations + this._failedSerializations;
    const averageDurationMs = completedCount > 0 ? this._totalDurationMs / completedCount : 0;

    return Object.freeze({
      totalSerializations: this._totalSerializations,
      successfulSerializations: this._successfulSerializations,
      failedSerializations: this._failedSerializations,
      cancelledSerializations: this._cancelledSerializations,
      timeoutSerializations: this._timeoutSerializations,
      activeSerializations: this._activeSerializations,
      transformationFailures: this._transformationFailures,
      serializerResolutionFailures: this._serializerResolutionFailures,
      averageDurationMs,
      slowestDurationMs: this._slowestDurationMs,
    });
  }

  public reset(): void {
    this._totalSerializations = 0;
    this._successfulSerializations = 0;
    this._failedSerializations = 0;
    this._cancelledSerializations = 0;
    this._timeoutSerializations = 0;
    this._activeSerializations = 0;
    this._transformationFailures = 0;
    this._serializerResolutionFailures = 0;
    this._totalDurationMs = 0;
    this._slowestDurationMs = 0;
  }
}
