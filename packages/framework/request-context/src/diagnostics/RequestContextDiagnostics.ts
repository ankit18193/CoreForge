import { RequestContextDiagnosticsSnapshot } from '../types/requestContextTypes';

export class RequestContextDiagnostics {
  private _activeContextCount = 0;
  private _totalCreated = 0;
  private _totalCompleted = 0;
  private _totalTimedOut = 0;
  private _totalCancelled = 0;
  private _totalFailed = 0;
  private _totalDurationMs = 0;
  private _slowestDurationMs = 0;
  private _slowestContextId: string | undefined = undefined;

  public recordContextCreated(): void {
    this._activeContextCount++;
    this._totalCreated++;
  }

  public recordContextCompleted(contextId: string, durationMs: number): void {
    this._activeContextCount = Math.max(0, this._activeContextCount - 1);
    this._totalCompleted++;
    this.recordDuration(contextId, durationMs);
  }

  public recordContextTimedOut(contextId: string, durationMs: number): void {
    this._activeContextCount = Math.max(0, this._activeContextCount - 1);
    this._totalTimedOut++;
    this._totalFailed++;
    this.recordDuration(contextId, durationMs);
  }

  public recordContextCancelled(contextId: string, durationMs: number): void {
    this._activeContextCount = Math.max(0, this._activeContextCount - 1);
    this._totalCancelled++;
    this.recordDuration(contextId, durationMs);
  }

  public recordContextFailed(contextId: string, durationMs: number): void {
    this._activeContextCount = Math.max(0, this._activeContextCount - 1);
    this._totalFailed++;
    this.recordDuration(contextId, durationMs);
  }

  private recordDuration(contextId: string, durationMs: number): void {
    this._totalDurationMs += durationMs;
    if (durationMs > this._slowestDurationMs) {
      this._slowestDurationMs = durationMs;
      this._slowestContextId = contextId;
    }
  }

  public snapshot(): RequestContextDiagnosticsSnapshot {
    const totalFinished = this._totalCompleted + this._totalFailed + this._totalCancelled;
    const avgDuration = totalFinished > 0 ? this._totalDurationMs / totalFinished : 0;

    const snap: RequestContextDiagnosticsSnapshot = {
      activeContextCount: this._activeContextCount,
      totalCreated: this._totalCreated,
      totalCompleted: this._totalCompleted,
      totalTimedOut: this._totalTimedOut,
      totalCancelled: this._totalCancelled,
      totalFailed: this._totalFailed,
      averageDurationMs: Number(avgDuration.toFixed(4)),
      slowestDurationMs: Number(this._slowestDurationMs.toFixed(4)),
      slowestContextId: this._slowestContextId,
      timestamp: Date.now(),
    };

    return Object.freeze(snap);
  }
}
