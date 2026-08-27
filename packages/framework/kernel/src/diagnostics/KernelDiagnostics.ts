import { KernelDiagnosticsSnapshot } from '../types/kernelTypes';

export class KernelDiagnostics {
  private _startAttempts = 0;
  private _successfulStarts = 0;
  private _failedStarts = 0;
  private _stopAttempts = 0;
  private _successfulStops = 0;
  private _failedStops = 0;
  private _totalOperations = 0;
  private _completedOperations = 0;
  private _failedOperations = 0;
  private _cancelledOperations = 0;
  private _activeOperations = 0;
  private _startupDurationMs = 0;
  private _shutdownDurationMs = 0;
  private _totalOperationDurationMs = 0;
  private _slowestOperationDurationMs = 0;
  private _componentStartFailures = 0;
  private _componentStopFailures = 0;
  private _registrationFailures = 0;
  private _dependencyFailures = 0;

  public recordStartAttempt(): void {
    this._startAttempts++;
  }

  public recordStartSuccess(durationMs: number): void {
    this._successfulStarts++;
    this._startupDurationMs = Math.round(durationMs * 100) / 100;
  }

  public recordStartFailure(): void {
    this._failedStarts++;
  }

  public recordStopAttempt(): void {
    this._stopAttempts++;
  }

  public recordStopSuccess(durationMs: number): void {
    this._successfulStops++;
    this._shutdownDurationMs = Math.round(durationMs * 100) / 100;
  }

  public recordStopFailure(): void {
    this._failedStops++;
  }

  public recordOperationStarted(): void {
    this._totalOperations++;
    this._activeOperations++;
  }

  public recordOperationCompleted(durationMs: number): void {
    this._activeOperations = Math.max(0, this._activeOperations - 1);
    this._completedOperations++;
    this._recordOperationDuration(durationMs);
  }

  public recordOperationFailed(durationMs: number): void {
    this._activeOperations = Math.max(0, this._activeOperations - 1);
    this._failedOperations++;
    this._recordOperationDuration(durationMs);
  }

  public recordOperationCancelled(durationMs: number): void {
    this._activeOperations = Math.max(0, this._activeOperations - 1);
    this._cancelledOperations++;
    this._recordOperationDuration(durationMs);
  }

  public recordComponentStartFailure(): void {
    this._componentStartFailures++;
  }

  public recordComponentStopFailure(): void {
    this._componentStopFailures++;
  }

  public recordRegistrationFailure(): void {
    this._registrationFailures++;
  }

  public recordDependencyFailure(): void {
    this._dependencyFailures++;
  }

  private _recordOperationDuration(durationMs: number): void {
    this._totalOperationDurationMs += durationMs;
    if (durationMs > this._slowestOperationDurationMs) {
      this._slowestOperationDurationMs = durationMs;
    }
  }

  public getSnapshot(): KernelDiagnosticsSnapshot {
    const finishedOperations =
      this._completedOperations + this._failedOperations + this._cancelledOperations;

    const averageOperationDurationMs =
      finishedOperations > 0
        ? Math.round((this._totalOperationDurationMs / finishedOperations) * 100) / 100
        : 0;

    return Object.freeze({
      startAttempts: this._startAttempts,
      successfulStarts: this._successfulStarts,
      failedStarts: this._failedStarts,
      stopAttempts: this._stopAttempts,
      successfulStops: this._successfulStops,
      failedStops: this._failedStops,
      totalOperations: this._totalOperations,
      completedOperations: this._completedOperations,
      failedOperations: this._failedOperations,
      cancelledOperations: this._cancelledOperations,
      activeOperations: this._activeOperations,
      startupDurationMs: this._startupDurationMs,
      shutdownDurationMs: this._shutdownDurationMs,
      averageOperationDurationMs,
      slowestOperationDurationMs: Math.round(this._slowestOperationDurationMs * 100) / 100,
      componentStartFailures: this._componentStartFailures,
      componentStopFailures: this._componentStopFailures,
      registrationFailures: this._registrationFailures,
      dependencyFailures: this._dependencyFailures,
    });
  }

  public reset(): void {
    this._startAttempts = 0;
    this._successfulStarts = 0;
    this._failedStarts = 0;
    this._stopAttempts = 0;
    this._successfulStops = 0;
    this._failedStops = 0;
    this._totalOperations = 0;
    this._completedOperations = 0;
    this._failedOperations = 0;
    this._cancelledOperations = 0;
    this._activeOperations = 0;
    this._startupDurationMs = 0;
    this._shutdownDurationMs = 0;
    this._totalOperationDurationMs = 0;
    this._slowestOperationDurationMs = 0;
    this._componentStartFailures = 0;
    this._componentStopFailures = 0;
    this._registrationFailures = 0;
    this._dependencyFailures = 0;
  }
}
