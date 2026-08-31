import type { HttpControllerDiagnosticsSnapshot } from '@coreforge/contracts';

export class HttpControllerDiagnostics {
  private _totalExecutions = 0;
  private _successfulExecutions = 0;
  private _failedExecutions = 0;
  private _cancelledExecutions = 0;
  private _skippedExecutions = 0;
  private _activeExecutions = 0;
  private _registrationFailures = 0;
  private _totalDurationMs = 0;
  private _slowestDurationMs = 0;

  public recordExecutionStarted(): void {
    this._totalExecutions++;
    this._activeExecutions++;
  }

  public recordExecutionSuccess(durationMs: number): void {
    this._activeExecutions = Math.max(0, this._activeExecutions - 1);
    this._successfulExecutions++;
    this._totalDurationMs += durationMs;
    if (durationMs > this._slowestDurationMs) {
      this._slowestDurationMs = durationMs;
    }
  }

  public recordExecutionFailure(durationMs: number): void {
    this._activeExecutions = Math.max(0, this._activeExecutions - 1);
    this._failedExecutions++;
    this._totalDurationMs += durationMs;
    if (durationMs > this._slowestDurationMs) {
      this._slowestDurationMs = durationMs;
    }
  }

  public recordExecutionCancelled(durationMs: number): void {
    this._activeExecutions = Math.max(0, this._activeExecutions - 1);
    this._cancelledExecutions++;
    this._totalDurationMs += durationMs;
  }

  public recordExecutionSkipped(): void {
    this._activeExecutions = Math.max(0, this._activeExecutions - 1);
    this._skippedExecutions++;
  }

  public recordRegistrationFailure(): void {
    this._registrationFailures++;
  }

  public getSnapshot(): HttpControllerDiagnosticsSnapshot {
    const completed =
      this._successfulExecutions + this._failedExecutions + this._cancelledExecutions;
    const averageDurationMs = completed > 0 ? this._totalDurationMs / completed : 0;

    return Object.freeze({
      totalExecutions: this._totalExecutions,
      successfulExecutions: this._successfulExecutions,
      failedExecutions: this._failedExecutions,
      cancelledExecutions: this._cancelledExecutions,
      skippedExecutions: this._skippedExecutions,
      activeExecutions: this._activeExecutions,
      registrationFailures: this._registrationFailures,
      averageDurationMs,
      slowestDurationMs: this._slowestDurationMs,
    });
  }

  public reset(): void {
    this._totalExecutions = 0;
    this._successfulExecutions = 0;
    this._failedExecutions = 0;
    this._cancelledExecutions = 0;
    this._skippedExecutions = 0;
    this._activeExecutions = 0;
    this._registrationFailures = 0;
    this._totalDurationMs = 0;
    this._slowestDurationMs = 0;
  }
}
