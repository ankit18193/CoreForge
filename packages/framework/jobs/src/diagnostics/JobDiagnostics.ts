import { JobDiagnosticsSnapshot } from '@coreforge/contracts';

export class JobDiagnostics {
  private _totalEnqueued = 0;
  private _totalCompleted = 0;
  private _totalFailed = 0;
  private _totalRetried = 0;
  private _totalCancelled = 0;
  private _totalDeadLettered = 0;
  private _totalDurationMs = 0;
  private _totalProcessed = 0;
  private _slowestDurationMs = 0;

  public recordEnqueue(): void {
    this._totalEnqueued++;
  }

  public recordCompleted(durationMs: number): void {
    this._totalCompleted++;
    this._recordDuration(durationMs);
  }

  public recordFailed(durationMs: number): void {
    this._totalFailed++;
    this._recordDuration(durationMs);
  }

  public recordRetried(): void {
    this._totalRetried++;
  }

  public recordCancelled(): void {
    this._totalCancelled++;
  }

  public recordDeadLettered(): void {
    this._totalDeadLettered++;
  }

  private _recordDuration(durationMs: number): void {
    this._totalProcessed++;
    this._totalDurationMs += durationMs;
    if (durationMs > this._slowestDurationMs) {
      this._slowestDurationMs = durationMs;
    }
  }

  public getSnapshot(activeJobs: number, queuedJobs: number): JobDiagnosticsSnapshot {
    const averageDurationMs =
      this._totalProcessed > 0
        ? Math.round((this._totalDurationMs / this._totalProcessed) * 100) / 100
        : 0;

    return Object.freeze({
      totalEnqueued: this._totalEnqueued,
      totalCompleted: this._totalCompleted,
      totalFailed: this._totalFailed,
      totalRetried: this._totalRetried,
      totalCancelled: this._totalCancelled,
      totalDeadLettered: this._totalDeadLettered,
      activeJobs,
      queuedJobs,
      averageDurationMs,
      slowestDurationMs: Math.round(this._slowestDurationMs * 100) / 100,
    });
  }

  public reset(): void {
    this._totalEnqueued = 0;
    this._totalCompleted = 0;
    this._totalFailed = 0;
    this._totalRetried = 0;
    this._totalCancelled = 0;
    this._totalDeadLettered = 0;
    this._totalDurationMs = 0;
    this._totalProcessed = 0;
    this._slowestDurationMs = 0;
  }
}
