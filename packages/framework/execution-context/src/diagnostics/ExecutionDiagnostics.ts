import { ExecutionDiagnosticsSnapshot } from '@coreforge/contracts';

export class ExecutionDiagnostics {
  private _totalContexts = 0;
  private _activeContexts = 0;
  private _completedContexts = 0;
  private _failedContexts = 0;
  private _cancelledContexts = 0;
  private _childContexts = 0;
  private _cancellationCount = 0;
  private _metadataRejections = 0;
  private _totalDurationMs = 0;
  private _slowestDurationMs = 0;

  public recordContextCreated(isChild: boolean): void {
    this._totalContexts++;
    if (isChild) {
      this._childContexts++;
    }
  }

  public recordContextStarted(): void {
    this._activeContexts++;
  }

  public recordContextCompleted(durationMs: number): void {
    this._completedContexts++;
    this._activeContexts = Math.max(0, this._activeContexts - 1);
    this._recordDuration(durationMs);
  }

  public recordContextFailed(durationMs: number): void {
    this._failedContexts++;
    this._activeContexts = Math.max(0, this._activeContexts - 1);
    this._recordDuration(durationMs);
  }

  public recordContextCancelled(durationMs: number): void {
    this._cancelledContexts++;
    this._activeContexts = Math.max(0, this._activeContexts - 1);
    this._recordDuration(durationMs);
  }

  public recordCancellation(): void {
    this._cancellationCount++;
  }

  public recordMetadataRejection(): void {
    this._metadataRejections++;
  }

  private _recordDuration(durationMs: number): void {
    this._totalDurationMs += durationMs;
    if (durationMs > this._slowestDurationMs) {
      this._slowestDurationMs = durationMs;
    }
  }

  public getSnapshot(): ExecutionDiagnosticsSnapshot {
    const finishedCount = this._completedContexts + this._failedContexts + this._cancelledContexts;
    const averageExecutionDurationMs =
      finishedCount > 0 ? Math.round((this._totalDurationMs / finishedCount) * 100) / 100 : 0;

    return Object.freeze({
      totalContexts: this._totalContexts,
      activeContexts: this._activeContexts,
      completedContexts: this._completedContexts,
      failedContexts: this._failedContexts,
      cancelledContexts: this._cancelledContexts,
      childContexts: this._childContexts,
      cancellationCount: this._cancellationCount,
      metadataRejections: this._metadataRejections,
      averageExecutionDurationMs,
      slowestExecutionDurationMs: Math.round(this._slowestDurationMs * 100) / 100,
    });
  }

  public reset(): void {
    this._totalContexts = 0;
    this._activeContexts = 0;
    this._completedContexts = 0;
    this._failedContexts = 0;
    this._cancelledContexts = 0;
    this._childContexts = 0;
    this._cancellationCount = 0;
    this._metadataRejections = 0;
    this._totalDurationMs = 0;
    this._slowestDurationMs = 0;
  }
}
