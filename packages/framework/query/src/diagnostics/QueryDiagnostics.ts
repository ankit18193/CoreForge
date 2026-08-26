import type { QueryDiagnosticsSnapshot } from '@coreforge/contracts';

export class QueryDiagnostics {
  private _totalQueries = 0;
  private _completedQueries = 0;
  private _failedQueries = 0;
  private _cancelledQueries = 0;
  private _handlerNotFound = 0;
  private _registrationFailures = 0;
  private _handlerExecutions = 0;
  private _handlerFailures = 0;
  private _activeQueries = 0;
  private _totalDurationMs = 0;
  private _slowestDurationMs = 0;

  public recordQueryStarted(): void {
    this._totalQueries++;
    this._activeQueries++;
  }

  public recordQueryCompleted(durationMs: number): void {
    this._completedQueries++;
    this._activeQueries = Math.max(0, this._activeQueries - 1);
    this._recordDuration(durationMs);
  }

  public recordQueryFailed(durationMs: number): void {
    this._failedQueries++;
    this._activeQueries = Math.max(0, this._activeQueries - 1);
    this._recordDuration(durationMs);
  }

  public recordQueryCancelled(durationMs: number): void {
    this._cancelledQueries++;
    this._activeQueries = Math.max(0, this._activeQueries - 1);
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

  public getSnapshot(): QueryDiagnosticsSnapshot {
    const finishedCount = this._completedQueries + this._failedQueries + this._cancelledQueries;
    const averageDurationMs =
      finishedCount > 0 ? Math.round((this._totalDurationMs / finishedCount) * 100) / 100 : 0;

    return Object.freeze({
      totalQueries: this._totalQueries,
      completedQueries: this._completedQueries,
      failedQueries: this._failedQueries,
      cancelledQueries: this._cancelledQueries,
      handlerNotFound: this._handlerNotFound,
      registrationFailures: this._registrationFailures,
      handlerExecutions: this._handlerExecutions,
      handlerFailures: this._handlerFailures,
      averageDurationMs,
      slowestDurationMs: Math.round(this._slowestDurationMs * 100) / 100,
      activeQueries: this._activeQueries,
    });
  }

  public reset(): void {
    this._totalQueries = 0;
    this._completedQueries = 0;
    this._failedQueries = 0;
    this._cancelledQueries = 0;
    this._handlerNotFound = 0;
    this._registrationFailures = 0;
    this._handlerExecutions = 0;
    this._handlerFailures = 0;
    this._activeQueries = 0;
    this._totalDurationMs = 0;
    this._slowestDurationMs = 0;
  }
}
