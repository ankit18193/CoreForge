import { TransportDiagnosticsSnapshot } from '../types/transportTypes';

export class TransportDiagnostics {
  private _totalRequests = 0;
  private _successfulRequests = 0;
  private _failedRequests = 0;
  private _abortedRequests = 0;
  private _normalizationFailures = 0;
  private _responseWriteFailures = 0;
  private _totalDurationMs = 0;
  private _slowestDurationMs = 0;
  private readonly _statusDistribution: Record<number, number> = {};

  public recordSuccess(status: number, durationMs: number): void {
    this._totalRequests++;
    this._successfulRequests++;
    this._totalDurationMs += durationMs;
    if (durationMs > this._slowestDurationMs) {
      this._slowestDurationMs = durationMs;
    }
    this._statusDistribution[status] = (this._statusDistribution[status] || 0) + 1;
  }

  public recordFailure(status: number, durationMs: number, isAborted = false): void {
    this._totalRequests++;
    this._failedRequests++;
    if (isAborted) {
      this._abortedRequests++;
    }
    this._totalDurationMs += durationMs;
    if (durationMs > this._slowestDurationMs) {
      this._slowestDurationMs = durationMs;
    }
    this._statusDistribution[status] = (this._statusDistribution[status] || 0) + 1;
  }

  public recordNormalizationFailure(): void {
    this._normalizationFailures++;
  }

  public recordResponseWriteFailure(): void {
    this._responseWriteFailures++;
  }

  public getSnapshot(): TransportDiagnosticsSnapshot {
    const totalCount = this._successfulRequests + this._failedRequests;
    const averageDurationMs = totalCount > 0 ? this._totalDurationMs / totalCount : 0;

    return Object.freeze({
      totalRequests: this._totalRequests,
      successfulRequests: this._successfulRequests,
      failedRequests: this._failedRequests,
      abortedRequests: this._abortedRequests,
      normalizationFailures: this._normalizationFailures,
      responseWriteFailures: this._responseWriteFailures,
      averageDurationMs,
      slowestDurationMs: this._slowestDurationMs,
      statusDistribution: Object.freeze({ ...this._statusDistribution }),
      timestamp: Date.now(),
    });
  }

  public reset(): void {
    this._totalRequests = 0;
    this._successfulRequests = 0;
    this._failedRequests = 0;
    this._abortedRequests = 0;
    this._normalizationFailures = 0;
    this._responseWriteFailures = 0;
    this._totalDurationMs = 0;
    this._slowestDurationMs = 0;
    for (const key of Object.keys(this._statusDistribution)) {
      delete this._statusDistribution[Number(key)];
    }
  }
}
