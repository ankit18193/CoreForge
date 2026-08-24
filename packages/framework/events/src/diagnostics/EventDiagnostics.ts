import { EventDiagnosticsSnapshot } from '../types/eventTypes';

export class EventDiagnostics {
  private _totalEvents = 0;
  private _successfulEvents = 0;
  private _failedEvents = 0;
  private _cancelledEvents = 0;
  private _totalHandlerExecutions = 0;
  private _failedHandlerExecutions = 0;
  private _retryCount = 0;
  private _totalEventDurationMs = 0;
  private _slowestEventDurationMs = 0;
  private readonly _eventTypeDistribution: Record<string, number> = {};

  public recordEvent(
    type: string,
    success: boolean,
    cancelled: boolean,
    handlerExecutions: number,
    failedExecutions: number,
    retries: number,
    durationMs: number,
  ): void {
    this._totalEvents++;
    this._eventTypeDistribution[type] = (this._eventTypeDistribution[type] || 0) + 1;

    if (cancelled) {
      this._cancelledEvents++;
    } else if (success) {
      this._successfulEvents++;
    } else {
      this._failedEvents++;
    }

    this._totalHandlerExecutions += handlerExecutions;
    this._failedHandlerExecutions += failedExecutions;
    this._retryCount += retries;
    this._totalEventDurationMs += durationMs;

    if (durationMs > this._slowestEventDurationMs) {
      this._slowestEventDurationMs = durationMs;
    }
  }

  public getSnapshot(): EventDiagnosticsSnapshot {
    const avg = this._totalEvents > 0 ? this._totalEventDurationMs / this._totalEvents : 0;
    return Object.freeze({
      totalEvents: this._totalEvents,
      successfulEvents: this._successfulEvents,
      failedEvents: this._failedEvents,
      cancelledEvents: this._cancelledEvents,
      totalHandlerExecutions: this._totalHandlerExecutions,
      failedHandlerExecutions: this._failedHandlerExecutions,
      retryCount: this._retryCount,
      averageEventDurationMs: avg,
      slowestEventDurationMs: this._slowestEventDurationMs,
      eventTypeDistribution: Object.freeze({ ...this._eventTypeDistribution }),
    });
  }

  public reset(): void {
    this._totalEvents = 0;
    this._successfulEvents = 0;
    this._failedEvents = 0;
    this._cancelledEvents = 0;
    this._totalHandlerExecutions = 0;
    this._failedHandlerExecutions = 0;
    this._retryCount = 0;
    this._totalEventDurationMs = 0;
    this._slowestEventDurationMs = 0;
    for (const key of Object.keys(this._eventTypeDistribution)) {
      delete this._eventTypeDistribution[key];
    }
  }
}
