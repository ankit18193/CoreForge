import { TraceDiagnosticsSnapshot } from '@coreforge/contracts';

export class TraceDiagnostics {
  private _totalTraces = 0;
  private _totalSpans = 0;
  private _completedSpans = 0;
  private _failedSpans = 0;
  private _cancelledSpans = 0;
  private _activeSpans = 0;
  private _providerFailures = 0;
  private _attributeLimitRejections = 0;
  private _eventLimitRejections = 0;
  private _linkLimitRejections = 0;
  private _totalSpanDurationMs = 0;
  private _slowestDurationMs = 0;

  public recordTraceStarted(): void {
    this._totalTraces++;
  }

  public recordSpanStarted(): void {
    this._totalSpans++;
    this._activeSpans++;
  }

  public recordSpanCompleted(durationMs: number): void {
    this._completedSpans++;
    this._activeSpans = Math.max(0, this._activeSpans - 1);
    this._recordDuration(durationMs);
  }

  public recordSpanFailed(durationMs: number): void {
    this._failedSpans++;
    this._activeSpans = Math.max(0, this._activeSpans - 1);
    this._recordDuration(durationMs);
  }

  public recordSpanCancelled(durationMs: number): void {
    this._cancelledSpans++;
    this._activeSpans = Math.max(0, this._activeSpans - 1);
    this._recordDuration(durationMs);
  }

  public recordProviderFailure(): void {
    this._providerFailures++;
  }

  public recordAttributeLimitRejection(): void {
    this._attributeLimitRejections++;
  }

  public recordEventLimitRejection(): void {
    this._eventLimitRejections++;
  }

  public recordLinkLimitRejection(): void {
    this._linkLimitRejections++;
  }

  private _recordDuration(durationMs: number): void {
    this._totalSpanDurationMs += durationMs;
    if (durationMs > this._slowestDurationMs) {
      this._slowestDurationMs = durationMs;
    }
  }

  public getSnapshot(): TraceDiagnosticsSnapshot {
    const finishedSpans = this._completedSpans + this._failedSpans + this._cancelledSpans;
    const averageDurationMs =
      finishedSpans > 0 ? Math.round((this._totalSpanDurationMs / finishedSpans) * 100) / 100 : 0;

    return Object.freeze({
      totalTraces: this._totalTraces,
      totalSpans: this._totalSpans,
      completedSpans: this._completedSpans,
      failedSpans: this._failedSpans,
      cancelledSpans: this._cancelledSpans,
      activeSpans: this._activeSpans,
      providerFailures: this._providerFailures,
      attributeLimitRejections: this._attributeLimitRejections,
      eventLimitRejections: this._eventLimitRejections,
      linkLimitRejections: this._linkLimitRejections,
      averageDurationMs,
      slowestDurationMs: Math.round(this._slowestDurationMs * 100) / 100,
    });
  }

  public reset(): void {
    this._totalTraces = 0;
    this._totalSpans = 0;
    this._completedSpans = 0;
    this._failedSpans = 0;
    this._cancelledSpans = 0;
    this._activeSpans = 0;
    this._providerFailures = 0;
    this._attributeLimitRejections = 0;
    this._eventLimitRejections = 0;
    this._linkLimitRejections = 0;
    this._totalSpanDurationMs = 0;
    this._slowestDurationMs = 0;
  }
}
