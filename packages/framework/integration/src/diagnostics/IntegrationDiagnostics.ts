import { IntegrationDiagnosticsSnapshot } from '../types/integrationTypes';

export class IntegrationDiagnostics {
  private _startupAttempts = 0;
  private _successfulStarts = 0;
  private _failedStarts = 0;
  private _shutdownAttempts = 0;
  private _successfulStops = 0;
  private _failedStops = 0;
  private _totalOperations = 0;
  private _completedOperations = 0;
  private _failedOperations = 0;
  private _cancelledOperations = 0;
  private _dispatchOperations = 0;
  private _queryOperations = 0;
  private _eventOperations = 0;
  private _serviceOperations = 0;
  private _executionOperations = 0;
  private _integrationFailures = 0;
  private _totalDurationMs = 0;
  private _slowestOperationDurationMs = 0;
  private _activeOperations = 0;

  public recordStartupAttempt(): void {
    this._startupAttempts++;
  }

  public recordStartupSuccess(): void {
    this._successfulStarts++;
  }

  public recordStartupFailure(): void {
    this._failedStarts++;
    this._integrationFailures++;
  }

  public recordShutdownAttempt(): void {
    this._shutdownAttempts++;
  }

  public recordShutdownSuccess(): void {
    this._successfulStops++;
  }

  public recordShutdownFailure(): void {
    this._failedStops++;
    this._integrationFailures++;
  }

  public recordOperationStarted(
    type: 'dispatch' | 'query' | 'event' | 'service' | 'execution',
  ): void {
    this._totalOperations++;
    this._activeOperations++;
    switch (type) {
      case 'dispatch':
        this._dispatchOperations++;
        break;
      case 'query':
        this._queryOperations++;
        break;
      case 'event':
        this._eventOperations++;
        break;
      case 'service':
        this._serviceOperations++;
        break;
      case 'execution':
        this._executionOperations++;
        break;
    }
  }

  public recordOperationCompleted(durationMs: number): void {
    this._activeOperations = Math.max(0, this._activeOperations - 1);
    this._completedOperations++;
    this._recordDuration(durationMs);
  }

  public recordOperationFailed(durationMs: number): void {
    this._activeOperations = Math.max(0, this._activeOperations - 1);
    this._failedOperations++;
    this._recordDuration(durationMs);
  }

  public recordOperationCancelled(durationMs: number): void {
    this._activeOperations = Math.max(0, this._activeOperations - 1);
    this._cancelledOperations++;
    this._recordDuration(durationMs);
  }

  public recordIntegrationFailure(): void {
    this._integrationFailures++;
  }

  private _recordDuration(durationMs: number): void {
    this._totalDurationMs += durationMs;
    if (durationMs > this._slowestOperationDurationMs) {
      this._slowestOperationDurationMs = durationMs;
    }
  }

  public getSnapshot(): IntegrationDiagnosticsSnapshot {
    const finishedCount =
      this._completedOperations + this._failedOperations + this._cancelledOperations;

    const averageOperationDurationMs =
      finishedCount > 0 ? Math.round((this._totalDurationMs / finishedCount) * 100) / 100 : 0;

    return Object.freeze({
      startupAttempts: this._startupAttempts,
      successfulStarts: this._successfulStarts,
      failedStarts: this._failedStarts,
      shutdownAttempts: this._shutdownAttempts,
      successfulStops: this._successfulStops,
      failedStops: this._failedStops,
      totalOperations: this._totalOperations,
      completedOperations: this._completedOperations,
      failedOperations: this._failedOperations,
      cancelledOperations: this._cancelledOperations,
      dispatchOperations: this._dispatchOperations,
      queryOperations: this._queryOperations,
      eventOperations: this._eventOperations,
      serviceOperations: this._serviceOperations,
      executionOperations: this._executionOperations,
      integrationFailures: this._integrationFailures,
      averageOperationDurationMs,
      slowestOperationDurationMs: Math.round(this._slowestOperationDurationMs * 100) / 100,
      activeOperations: this._activeOperations,
    });
  }

  public reset(): void {
    this._startupAttempts = 0;
    this._successfulStarts = 0;
    this._failedStarts = 0;
    this._shutdownAttempts = 0;
    this._successfulStops = 0;
    this._failedStops = 0;
    this._totalOperations = 0;
    this._completedOperations = 0;
    this._failedOperations = 0;
    this._cancelledOperations = 0;
    this._dispatchOperations = 0;
    this._queryOperations = 0;
    this._eventOperations = 0;
    this._serviceOperations = 0;
    this._executionOperations = 0;
    this._integrationFailures = 0;
    this._totalDurationMs = 0;
    this._slowestOperationDurationMs = 0;
    this._activeOperations = 0;
  }
}
