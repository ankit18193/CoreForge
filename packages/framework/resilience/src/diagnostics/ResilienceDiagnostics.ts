import { ResilienceDiagnosticsSnapshot } from '@coreforge/contracts';

export class ResilienceDiagnostics {
  private _totalExecutions = 0;
  private _successfulExecutions = 0;
  private _failedExecutions = 0;
  private _retryCount = 0;
  private _timeoutCount = 0;
  private _cancellationCount = 0;
  private _fallbackExecutions = 0;
  private _fallbackFailures = 0;
  private _circuitOpenRejections = 0;
  private _circuitTransitions = 0;
  private _bulkheadRejections = 0;
  private _classifierFailures = 0;
  private _totalDurationMs = 0;
  private _slowestDurationMs = 0;

  public recordExecutionStart(): void {
    this._totalExecutions++;
  }

  public recordSuccess(durationMs: number): void {
    this._successfulExecutions++;
    this._recordDuration(durationMs);
  }

  public recordFailure(durationMs: number): void {
    this._failedExecutions++;
    this._recordDuration(durationMs);
  }

  public recordRetry(): void {
    this._retryCount++;
  }

  public recordTimeout(): void {
    this._timeoutCount++;
  }

  public recordCancellation(): void {
    this._cancellationCount++;
  }

  public recordFallback(success: boolean): void {
    this._fallbackExecutions++;
    if (!success) {
      this._fallbackFailures++;
    }
  }

  public recordCircuitOpenRejection(): void {
    this._circuitOpenRejections++;
  }

  public recordCircuitTransition(): void {
    this._circuitTransitions++;
  }

  public recordBulkheadRejection(): void {
    this._bulkheadRejections++;
  }

  public recordClassifierFailure(): void {
    this._classifierFailures++;
  }

  private _recordDuration(durationMs: number): void {
    this._totalDurationMs += durationMs;
    if (durationMs > this._slowestDurationMs) {
      this._slowestDurationMs = durationMs;
    }
  }

  public getSnapshot(): ResilienceDiagnosticsSnapshot {
    const completed = this._successfulExecutions + this._failedExecutions;
    const averageDurationMs =
      completed > 0 ? Math.round((this._totalDurationMs / completed) * 100) / 100 : 0;

    return Object.freeze({
      totalExecutions: this._totalExecutions,
      successfulExecutions: this._successfulExecutions,
      failedExecutions: this._failedExecutions,
      retryCount: this._retryCount,
      timeoutCount: this._timeoutCount,
      cancellationCount: this._cancellationCount,
      fallbackExecutions: this._fallbackExecutions,
      fallbackFailures: this._fallbackFailures,
      circuitOpenRejections: this._circuitOpenRejections,
      circuitTransitions: this._circuitTransitions,
      bulkheadRejections: this._bulkheadRejections,
      classifierFailures: this._classifierFailures,
      averageDurationMs,
      slowestDurationMs: Math.round(this._slowestDurationMs * 100) / 100,
    });
  }

  public reset(): void {
    this._totalExecutions = 0;
    this._successfulExecutions = 0;
    this._failedExecutions = 0;
    this._retryCount = 0;
    this._timeoutCount = 0;
    this._cancellationCount = 0;
    this._fallbackExecutions = 0;
    this._fallbackFailures = 0;
    this._circuitOpenRejections = 0;
    this._circuitTransitions = 0;
    this._bulkheadRejections = 0;
    this._classifierFailures = 0;
    this._totalDurationMs = 0;
    this._slowestDurationMs = 0;
  }
}
