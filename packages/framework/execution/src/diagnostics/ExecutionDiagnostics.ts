import { ExecutionEngineDiagnosticsSnapshot } from '@coreforge/contracts';

export class ExecutionDiagnostics {
  private _totalExecutions = 0;
  private _completedExecutions = 0;
  private _failedExecutions = 0;
  private _cancelledExecutions = 0;
  private _shortCircuitedExecutions = 0;
  private _middlewareExecutions = 0;
  private _middlewareFailures = 0;
  private _handlerExecutions = 0;
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

  public recordShortCircuit(): void {
    this._shortCircuitedExecutions++;
  }

  public recordMiddlewareExecuted(): void {
    this._middlewareExecutions++;
  }

  public recordMiddlewareFailed(): void {
    this._middlewareFailures++;
  }

  public recordHandlerExecuted(): void {
    this._handlerExecutions++;
  }

  private _recordDuration(durationMs: number): void {
    this._totalDurationMs += durationMs;
    if (durationMs > this._slowestDurationMs) {
      this._slowestDurationMs = durationMs;
    }
  }

  public getSnapshot(): ExecutionEngineDiagnosticsSnapshot {
    const finishedCount =
      this._completedExecutions + this._failedExecutions + this._cancelledExecutions;
    const averageDurationMs =
      finishedCount > 0 ? Math.round((this._totalDurationMs / finishedCount) * 100) / 100 : 0;

    return Object.freeze({
      totalExecutions: this._totalExecutions,
      completedExecutions: this._completedExecutions,
      failedExecutions: this._failedExecutions,
      cancelledExecutions: this._cancelledExecutions,
      shortCircuitedExecutions: this._shortCircuitedExecutions,
      middlewareExecutions: this._middlewareExecutions,
      middlewareFailures: this._middlewareFailures,
      handlerExecutions: this._handlerExecutions,
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
    this._shortCircuitedExecutions = 0;
    this._middlewareExecutions = 0;
    this._middlewareFailures = 0;
    this._handlerExecutions = 0;
    this._activeExecutions = 0;
    this._totalDurationMs = 0;
    this._slowestDurationMs = 0;
  }
}
