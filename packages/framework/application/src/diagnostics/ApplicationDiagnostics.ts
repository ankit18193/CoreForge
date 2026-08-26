import type { ApplicationDiagnosticsSnapshot } from '@coreforge/contracts';

export class ApplicationDiagnostics {
  private _totalExecutions = 0;
  private _completedExecutions = 0;
  private _failedExecutions = 0;
  private _cancelledExecutions = 0;
  private _serviceNotFound = 0;
  private _registrationFailures = 0;
  private _serviceExecutions = 0;
  private _serviceFailures = 0;
  private _nestedOperations = 0;
  private _activeExecutions = 0;
  private _totalDurationMs = 0;
  private _slowestDurationMs = 0;

  public recordExecutionStarted(): void {
    this._totalExecutions++;
    this._activeExecutions++;
  }

  public recordExecutionCompleted(durationMs: number): void {
    this._completedExecutions++;
    this._activeExecutions = Math.max(0, this._activeExecutions - 1);
    this._recordDuration(durationMs);
  }

  public recordExecutionFailed(durationMs: number): void {
    this._failedExecutions++;
    this._activeExecutions = Math.max(0, this._activeExecutions - 1);
    this._recordDuration(durationMs);
  }

  public recordExecutionCancelled(durationMs: number): void {
    this._cancelledExecutions++;
    this._activeExecutions = Math.max(0, this._activeExecutions - 1);
    this._recordDuration(durationMs);
  }

  public recordServiceNotFound(): void {
    this._serviceNotFound++;
  }

  public recordRegistrationFailure(): void {
    this._registrationFailures++;
  }

  public recordServiceExecuted(): void {
    this._serviceExecutions++;
  }

  public recordServiceFailed(): void {
    this._serviceFailures++;
  }

  public recordNestedOperation(): void {
    this._nestedOperations++;
  }

  private _recordDuration(durationMs: number): void {
    this._totalDurationMs += durationMs;
    if (durationMs > this._slowestDurationMs) {
      this._slowestDurationMs = durationMs;
    }
  }

  public getSnapshot(): ApplicationDiagnosticsSnapshot {
    const finishedCount =
      this._completedExecutions + this._failedExecutions + this._cancelledExecutions;
    const averageDurationMs =
      finishedCount > 0 ? Math.round((this._totalDurationMs / finishedCount) * 100) / 100 : 0;

    return Object.freeze({
      totalExecutions: this._totalExecutions,
      completedExecutions: this._completedExecutions,
      failedExecutions: this._failedExecutions,
      cancelledExecutions: this._cancelledExecutions,
      serviceNotFound: this._serviceNotFound,
      registrationFailures: this._registrationFailures,
      serviceExecutions: this._serviceExecutions,
      serviceFailures: this._serviceFailures,
      nestedOperations: this._nestedOperations,
      averageDurationMs,
      slowestDurationMs: Math.round(this._slowestDurationMs * 100) / 100,
      activeExecutions: this._activeExecutions,
    });
  }

  public reset(): void {
    this._totalExecutions = 0;
    this._completedExecutions = 0;
    this._failedExecutions = 0;
    this._cancelledExecutions = 0;
    this._serviceNotFound = 0;
    this._registrationFailures = 0;
    this._serviceExecutions = 0;
    this._serviceFailures = 0;
    this._nestedOperations = 0;
    this._activeExecutions = 0;
    this._totalDurationMs = 0;
    this._slowestDurationMs = 0;
  }
}
