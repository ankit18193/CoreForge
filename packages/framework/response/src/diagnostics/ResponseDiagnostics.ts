import { ResponseDiagnosticsSnapshot, ResponseStatus } from '../types/responseTypes';

export class ResponseDiagnostics {
  private _totalProcessed = 0;
  private _successfulProcessed = 0;
  private _serializationFailures = 0;
  private _circularFailures = 0;
  private _totalDurationMs = 0;
  private _slowestDurationMs = 0;
  private readonly _statusDistribution = new Map<ResponseStatus, number>();

  public recordSuccess(status: ResponseStatus, durationMs: number): void {
    this._totalProcessed++;
    this._successfulProcessed++;
    this._totalDurationMs += durationMs;
    if (durationMs > this._slowestDurationMs) {
      this._slowestDurationMs = durationMs;
    }

    const count = this._statusDistribution.get(status) || 0;
    this._statusDistribution.set(status, count + 1);
  }

  public recordFailure(
    durationMs: number,
    flags: { isSerializationFailure?: boolean; isCircularFailure?: boolean } = {},
  ): void {
    this._totalProcessed++;
    this._totalDurationMs += durationMs;
    if (durationMs > this._slowestDurationMs) {
      this._slowestDurationMs = durationMs;
    }

    if (flags.isCircularFailure) {
      this._circularFailures++;
      this._serializationFailures++;
    } else if (flags.isSerializationFailure) {
      this._serializationFailures++;
    }
  }

  public snapshot(): ResponseDiagnosticsSnapshot {
    const avg = this._totalProcessed > 0 ? this._totalDurationMs / this._totalProcessed : 0;

    const distribution: Record<number, number> = {};
    for (const [status, count] of this._statusDistribution.entries()) {
      distribution[status] = count;
    }

    const snap: ResponseDiagnosticsSnapshot = {
      totalProcessed: this._totalProcessed,
      successfulProcessed: this._successfulProcessed,
      serializationFailures: this._serializationFailures,
      circularFailures: this._circularFailures,
      totalDurationMs: Number(this._totalDurationMs.toFixed(4)),
      averageDurationMs: Number(avg.toFixed(4)),
      slowestDurationMs: Number(this._slowestDurationMs.toFixed(4)),
      statusDistribution: Object.freeze(distribution),
      timestamp: Date.now(),
    };

    return Object.freeze(snap);
  }
}
