import type { HttpMiddlewareDiagnosticsSnapshot } from '@coreforge/contracts';

export class HttpMiddlewareDiagnostics {
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
    if (this._activeExecutions > 0) {
      this._activeExecutions--;
    }
    this._successfulExecutions++;
    this._totalDurationMs += durationMs;
    if (durationMs > this._slowestDurationMs) {
      this._slowestDurationMs = durationMs;
    }
  }

  public recordExecutionFailure(durationMs: number, isCancelled = false): void {
    if (this._activeExecutions > 0) {
      this._activeExecutions--;
    }
    if (isCancelled) {
      this._cancelledExecutions++;
    } else {
      this._failedExecutions++;
    }
    this._totalDurationMs += durationMs;
    if (durationMs > this._slowestDurationMs) {
      this._slowestDurationMs = durationMs;
    }
  }

  public recordExecutionSkipped(): void {
    this._skippedExecutions++;
  }

  public recordRegistrationFailure(): void {
    this._registrationFailures++;
  }

  public getSnapshot(): HttpMiddlewareDiagnosticsSnapshot {
    const completedExecutions =
      this._successfulExecutions + this._failedExecutions + this._cancelledExecutions;
    const averageDurationMs =
      completedExecutions > 0
        ? Number((this._totalDurationMs / completedExecutions).toFixed(3))
        : 0;

    const snapshot: HttpMiddlewareDiagnosticsSnapshot = {
      totalExecutions: this._totalExecutions,
      successfulExecutions: this._successfulExecutions,
      failedExecutions: this._failedExecutions,
      cancelledExecutions: this._cancelledExecutions,
      skippedExecutions: this._skippedExecutions,
      activeExecutions: this._activeExecutions,
      registrationFailures: this._registrationFailures,
      averageDurationMs,
      slowestDurationMs: Number(this._slowestDurationMs.toFixed(3)),
    };

    return Object.freeze(snapshot);
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
