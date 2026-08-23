import { ExecutionDiagnosticsSnapshot } from '../types/executionTypes';

export class ExecutionDiagnostics {
  private _totalExecutions = 0;
  private _successfulExecutions = 0;
  private _failedExecutions = 0;
  private _guardRejections = 0;
  private _middlewareFailures = 0;
  private _interceptorFailures = 0;
  private _actionFailures = 0;
  private _totalDurationMs = 0;
  private _slowestDurationMs = 0;

  public recordSuccess(durationMs: number): void {
    this._totalExecutions++;
    this._successfulExecutions++;
    this._totalDurationMs += durationMs;
    if (durationMs > this._slowestDurationMs) {
      this._slowestDurationMs = durationMs;
    }
  }

  public recordFailure(
    durationMs: number,
    flags: {
      isGuardRejection?: boolean;
      isMiddlewareFailure?: boolean;
      isInterceptorFailure?: boolean;
      isActionFailure?: boolean;
    } = {},
  ): void {
    this._totalExecutions++;
    this._failedExecutions++;
    this._totalDurationMs += durationMs;
    if (durationMs > this._slowestDurationMs) {
      this._slowestDurationMs = durationMs;
    }

    if (flags.isGuardRejection) {
      this._guardRejections++;
    }
    if (flags.isMiddlewareFailure) {
      this._middlewareFailures++;
    }
    if (flags.isInterceptorFailure) {
      this._interceptorFailures++;
    }
    if (flags.isActionFailure) {
      this._actionFailures++;
    }
  }

  public snapshot(): ExecutionDiagnosticsSnapshot {
    const avg = this._totalExecutions > 0 ? this._totalDurationMs / this._totalExecutions : 0;

    const snap: ExecutionDiagnosticsSnapshot = {
      totalExecutions: this._totalExecutions,
      successfulExecutions: this._successfulExecutions,
      failedExecutions: this._failedExecutions,
      guardRejections: this._guardRejections,
      middlewareFailures: this._middlewareFailures,
      interceptorFailures: this._interceptorFailures,
      actionFailures: this._actionFailures,
      totalDurationMs: Number(this._totalDurationMs.toFixed(4)),
      averageDurationMs: Number(avg.toFixed(4)),
      slowestDurationMs: Number(this._slowestDurationMs.toFixed(4)),
      timestamp: Date.now(),
    };

    return Object.freeze(snap);
  }
}
