import { HookDiagnosticsSnapshot, HookType } from '../types/hookTypes';

export class HookDiagnostics {
  private _totalHookExecutions = 0;
  private _successfulHookExecutions = 0;
  private _failedHookExecutions = 0;
  private _cancelledHookExecutions = 0;
  private _skippedHookExecutions = 0;
  private _beforeStartExecutions = 0;
  private _afterStartExecutions = 0;
  private _beforeStopExecutions = 0;
  private _afterStopExecutions = 0;
  private _beforeExecuteExecutions = 0;
  private _afterExecuteExecutions = 0;
  private _errorHookExecutions = 0;
  private _totalDurationMs = 0;
  private _slowestDurationMs = 0;
  private _activeHookExecutions = 0;
  private _registrationFailures = 0;

  public recordHookStarted(): void {
    this._totalHookExecutions++;
    this._activeHookExecutions++;
  }

  public recordHookCompleted(type: HookType, durationMs: number): void {
    this._activeHookExecutions = Math.max(0, this._activeHookExecutions - 1);
    this._successfulHookExecutions++;
    this._recordTypeExecution(type);
    this._recordDuration(durationMs);
  }

  public recordHookFailed(type: HookType, durationMs: number): void {
    this._activeHookExecutions = Math.max(0, this._activeHookExecutions - 1);
    this._failedHookExecutions++;
    this._recordTypeExecution(type);
    this._recordDuration(durationMs);
  }

  public recordHookCancelled(type: HookType, durationMs: number): void {
    this._activeHookExecutions = Math.max(0, this._activeHookExecutions - 1);
    this._cancelledHookExecutions++;
    this._recordTypeExecution(type);
    this._recordDuration(durationMs);
  }

  public recordHookSkipped(type: HookType): void {
    this._skippedHookExecutions++;
    this._recordTypeExecution(type);
  }

  public recordRegistrationFailure(): void {
    this._registrationFailures++;
  }

  private _recordTypeExecution(type: HookType): void {
    switch (type) {
      case 'BEFORE_START':
        this._beforeStartExecutions++;
        break;
      case 'AFTER_START':
        this._afterStartExecutions++;
        break;
      case 'BEFORE_STOP':
        this._beforeStopExecutions++;
        break;
      case 'AFTER_STOP':
        this._afterStopExecutions++;
        break;
      case 'BEFORE_EXECUTE':
        this._beforeExecuteExecutions++;
        break;
      case 'AFTER_EXECUTE':
        this._afterExecuteExecutions++;
        break;
      case 'ON_ERROR':
        this._errorHookExecutions++;
        break;
    }
  }

  private _recordDuration(durationMs: number): void {
    this._totalDurationMs += durationMs;
    if (durationMs > this._slowestDurationMs) {
      this._slowestDurationMs = durationMs;
    }
  }

  public getSnapshot(): HookDiagnosticsSnapshot {
    const finishedCount =
      this._successfulHookExecutions + this._failedHookExecutions + this._cancelledHookExecutions;

    const averageDurationMs =
      finishedCount > 0 ? Math.round((this._totalDurationMs / finishedCount) * 100) / 100 : 0;

    return Object.freeze({
      totalHookExecutions: this._totalHookExecutions,
      successfulHookExecutions: this._successfulHookExecutions,
      failedHookExecutions: this._failedHookExecutions,
      cancelledHookExecutions: this._cancelledHookExecutions,
      skippedHookExecutions: this._skippedHookExecutions,
      beforeStartExecutions: this._beforeStartExecutions,
      afterStartExecutions: this._afterStartExecutions,
      beforeStopExecutions: this._beforeStopExecutions,
      afterStopExecutions: this._afterStopExecutions,
      beforeExecuteExecutions: this._beforeExecuteExecutions,
      afterExecuteExecutions: this._afterExecuteExecutions,
      errorHookExecutions: this._errorHookExecutions,
      averageDurationMs,
      slowestDurationMs: Math.round(this._slowestDurationMs * 100) / 100,
      activeHookExecutions: this._activeHookExecutions,
      registrationFailures: this._registrationFailures,
    });
  }

  public reset(): void {
    this._totalHookExecutions = 0;
    this._successfulHookExecutions = 0;
    this._failedHookExecutions = 0;
    this._cancelledHookExecutions = 0;
    this._skippedHookExecutions = 0;
    this._beforeStartExecutions = 0;
    this._afterStartExecutions = 0;
    this._beforeStopExecutions = 0;
    this._afterStopExecutions = 0;
    this._beforeExecuteExecutions = 0;
    this._afterExecuteExecutions = 0;
    this._errorHookExecutions = 0;
    this._totalDurationMs = 0;
    this._slowestDurationMs = 0;
    this._activeHookExecutions = 0;
    this._registrationFailures = 0;
  }
}
