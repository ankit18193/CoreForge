import type { DispatchDiagnosticsSnapshot } from '@coreforge/contracts';

export class DispatchDiagnostics {
  private _totalDispatches = 0;
  private _completedDispatches = 0;
  private _failedDispatches = 0;
  private _cancelledDispatches = 0;
  private _handlerNotFound = 0;
  private _registrationFailures = 0;
  private _handlerExecutions = 0;
  private _handlerFailures = 0;
  private _activeDispatches = 0;
  private _totalDurationMs = 0;
  private _slowestDurationMs = 0;

  public recordDispatchStarted(): void {
    this._totalDispatches++;
    this._activeDispatches++;
  }

  public recordDispatchCompleted(durationMs: number): void {
    this._completedDispatches++;
    this._activeDispatches = Math.max(0, this._activeDispatches - 1);
    this._recordDuration(durationMs);
  }

  public recordDispatchFailed(durationMs: number): void {
    this._failedDispatches++;
    this._activeDispatches = Math.max(0, this._activeDispatches - 1);
    this._recordDuration(durationMs);
  }

  public recordDispatchCancelled(durationMs: number): void {
    this._cancelledDispatches++;
    this._activeDispatches = Math.max(0, this._activeDispatches - 1);
    this._recordDuration(durationMs);
  }

  public recordHandlerNotFound(): void {
    this._handlerNotFound++;
  }

  public recordRegistrationFailure(): void {
    this._registrationFailures++;
  }

  public recordHandlerExecuted(): void {
    this._handlerExecutions++;
  }

  public recordHandlerFailed(): void {
    this._handlerFailures++;
  }

  private _recordDuration(durationMs: number): void {
    this._totalDurationMs += durationMs;
    if (durationMs > this._slowestDurationMs) {
      this._slowestDurationMs = durationMs;
    }
  }

  public getSnapshot(): DispatchDiagnosticsSnapshot {
    const finishedCount =
      this._completedDispatches + this._failedDispatches + this._cancelledDispatches;
    const averageDurationMs =
      finishedCount > 0 ? Math.round((this._totalDurationMs / finishedCount) * 100) / 100 : 0;

    return Object.freeze({
      totalDispatches: this._totalDispatches,
      completedDispatches: this._completedDispatches,
      failedDispatches: this._failedDispatches,
      cancelledDispatches: this._cancelledDispatches,
      handlerNotFound: this._handlerNotFound,
      registrationFailures: this._registrationFailures,
      handlerExecutions: this._handlerExecutions,
      handlerFailures: this._handlerFailures,
      averageDurationMs,
      slowestDurationMs: Math.round(this._slowestDurationMs * 100) / 100,
      activeDispatches: this._activeDispatches,
    });
  }

  public reset(): void {
    this._totalDispatches = 0;
    this._completedDispatches = 0;
    this._failedDispatches = 0;
    this._cancelledDispatches = 0;
    this._handlerNotFound = 0;
    this._registrationFailures = 0;
    this._handlerExecutions = 0;
    this._handlerFailures = 0;
    this._activeDispatches = 0;
    this._totalDurationMs = 0;
    this._slowestDurationMs = 0;
  }
}
