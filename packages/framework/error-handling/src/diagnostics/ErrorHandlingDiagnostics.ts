import { ErrorHandlingDiagnosticsSnapshot } from '../types/errorHandlingTypes';

export class ErrorHandlingDiagnostics {
  private _totalErrors = 0;
  private _handledErrors = 0;
  private _transformedErrors = 0;
  private _recoveredErrors = 0;
  private _rethrownErrors = 0;
  private _cancelledErrors = 0;
  private _unknownErrors = 0;
  private _classificationFailures = 0;
  private _normalizationFailures = 0;
  private _sanitizationFailures = 0;
  private _handlerExecutions = 0;
  private _handlerFailures = 0;
  private _activeProcessing = 0;
  private _totalDurationMs = 0;
  private _slowestDurationMs = 0;

  public recordProcessingStarted(): void {
    this._totalErrors++;
    this._activeProcessing++;
  }

  public recordProcessingFinished(durationMs: number): void {
    this._activeProcessing = Math.max(0, this._activeProcessing - 1);
    this._recordDuration(durationMs);
  }

  public recordHandled(): void {
    this._handledErrors++;
  }

  public recordTransformed(): void {
    this._transformedErrors++;
  }

  public recordRecovered(): void {
    this._recoveredErrors++;
  }

  public recordRethrown(): void {
    this._rethrownErrors++;
  }

  public recordCancelled(): void {
    this._cancelledErrors++;
  }

  public recordUnknown(): void {
    this._unknownErrors++;
  }

  public recordClassificationFailure(): void {
    this._classificationFailures++;
  }

  public recordNormalizationFailure(): void {
    this._normalizationFailures++;
  }

  public recordSanitizationFailure(): void {
    this._sanitizationFailures++;
  }

  public recordHandlerExecution(): void {
    this._handlerExecutions++;
  }

  public recordHandlerFailure(): void {
    this._handlerFailures++;
  }

  private _recordDuration(durationMs: number): void {
    this._totalDurationMs += durationMs;
    if (durationMs > this._slowestDurationMs) {
      this._slowestDurationMs = durationMs;
    }
  }

  public getSnapshot(): ErrorHandlingDiagnosticsSnapshot {
    const finishedCount =
      this._handledErrors +
      this._transformedErrors +
      this._recoveredErrors +
      this._rethrownErrors +
      this._cancelledErrors;

    const averageDurationMs =
      finishedCount > 0 ? Math.round((this._totalDurationMs / finishedCount) * 100) / 100 : 0;

    return Object.freeze({
      totalErrors: this._totalErrors,
      handledErrors: this._handledErrors,
      transformedErrors: this._transformedErrors,
      recoveredErrors: this._recoveredErrors,
      rethrownErrors: this._rethrownErrors,
      cancelledErrors: this._cancelledErrors,
      unknownErrors: this._unknownErrors,
      classificationFailures: this._classificationFailures,
      normalizationFailures: this._normalizationFailures,
      sanitizationFailures: this._sanitizationFailures,
      handlerExecutions: this._handlerExecutions,
      handlerFailures: this._handlerFailures,
      averageDurationMs,
      slowestDurationMs: Math.round(this._slowestDurationMs * 100) / 100,
      activeProcessing: this._activeProcessing,
    });
  }

  public reset(): void {
    this._totalErrors = 0;
    this._handledErrors = 0;
    this._transformedErrors = 0;
    this._recoveredErrors = 0;
    this._rethrownErrors = 0;
    this._cancelledErrors = 0;
    this._unknownErrors = 0;
    this._classificationFailures = 0;
    this._normalizationFailures = 0;
    this._sanitizationFailures = 0;
    this._handlerExecutions = 0;
    this._handlerFailures = 0;
    this._activeProcessing = 0;
    this._totalDurationMs = 0;
    this._slowestDurationMs = 0;
  }
}
