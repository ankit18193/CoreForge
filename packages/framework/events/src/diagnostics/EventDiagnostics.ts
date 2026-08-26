import { EventDiagnosticsSnapshot } from '../types/eventTypes';

export class EventDiagnostics {
  private _totalPublications = 0;
  private _successfulPublications = 0;
  private _failedPublications = 0;
  private _cancelledPublications = 0;
  private _totalHandlersExecuted = 0;
  private _successfulHandlers = 0;
  private _failedHandlers = 0;
  private _handlerNotFound = 0;
  private _registrationFailures = 0;
  private _nestedPublications = 0;
  private _activePublications = 0;
  private _totalDurationMs = 0;
  private _slowestDurationMs = 0;

  public recordPublicationStarted(): void {
    this._totalPublications++;
    this._activePublications++;
  }

  public recordPublicationCompleted(durationMs: number): void {
    this._successfulPublications++;
    this._activePublications = Math.max(0, this._activePublications - 1);
    this._recordDuration(durationMs);
  }

  public recordPublicationFailed(durationMs: number): void {
    this._failedPublications++;
    this._activePublications = Math.max(0, this._activePublications - 1);
    this._recordDuration(durationMs);
  }

  public recordPublicationCancelled(durationMs: number): void {
    this._cancelledPublications++;
    this._activePublications = Math.max(0, this._activePublications - 1);
    this._recordDuration(durationMs);
  }

  public recordHandlerExecuted(): void {
    this._totalHandlersExecuted++;
  }

  public recordHandlerSuccess(): void {
    this._successfulHandlers++;
  }

  public recordHandlerFailure(): void {
    this._failedHandlers++;
  }

  public recordHandlerNotFound(): void {
    this._handlerNotFound++;
  }

  public recordRegistrationFailure(): void {
    this._registrationFailures++;
  }

  public recordNestedPublication(): void {
    this._nestedPublications++;
  }

  private _recordDuration(durationMs: number): void {
    this._totalDurationMs += durationMs;
    if (durationMs > this._slowestDurationMs) {
      this._slowestDurationMs = durationMs;
    }
  }

  public getSnapshot(): EventDiagnosticsSnapshot {
    const finishedCount =
      this._successfulPublications + this._failedPublications + this._cancelledPublications;
    const averageDurationMs =
      finishedCount > 0 ? Math.round((this._totalDurationMs / finishedCount) * 100) / 100 : 0;

    return Object.freeze({
      totalPublications: this._totalPublications,
      successfulPublications: this._successfulPublications,
      failedPublications: this._failedPublications,
      cancelledPublications: this._cancelledPublications,
      totalHandlersExecuted: this._totalHandlersExecuted,
      successfulHandlers: this._successfulHandlers,
      failedHandlers: this._failedHandlers,
      handlerNotFound: this._handlerNotFound,
      registrationFailures: this._registrationFailures,
      nestedPublications: this._nestedPublications,
      averageDurationMs,
      slowestDurationMs: Math.round(this._slowestDurationMs * 100) / 100,
      activePublications: this._activePublications,
    });
  }

  public reset(): void {
    this._totalPublications = 0;
    this._successfulPublications = 0;
    this._failedPublications = 0;
    this._cancelledPublications = 0;
    this._totalHandlersExecuted = 0;
    this._successfulHandlers = 0;
    this._failedHandlers = 0;
    this._handlerNotFound = 0;
    this._registrationFailures = 0;
    this._nestedPublications = 0;
    this._activePublications = 0;
    this._totalDurationMs = 0;
    this._slowestDurationMs = 0;
  }
}
