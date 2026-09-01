import { HttpErrorMappingDiagnosticsSnapshot } from '@coreforge/contracts';

export class HttpErrorMappingDiagnostics {
  private _totalErrorsMapped = 0;
  private _successfulMappings = 0;
  private _fallbackMappings = 0;
  private _mappingFailures = 0;
  private _resolutionFailures = 0;
  private _totalDurationMs = 0;
  private _slowestDurationMs = 0;
  private readonly _statusDistribution: Record<number, number> = {};

  public recordSuccess(status: number, durationMs: number): void {
    this._totalErrorsMapped++;
    this._successfulMappings++;
    this._recordDuration(durationMs);
    this._recordStatus(status);
  }

  public recordFallback(status: number, durationMs: number): void {
    this._totalErrorsMapped++;
    this._fallbackMappings++;
    this._recordDuration(durationMs);
    this._recordStatus(status);
  }

  public recordFailure(durationMs: number): void {
    this._totalErrorsMapped++;
    this._mappingFailures++;
    this._recordDuration(durationMs);
  }

  public recordResolutionFailure(): void {
    this._resolutionFailures++;
  }

  public getSnapshot(): HttpErrorMappingDiagnosticsSnapshot {
    const averageDurationMs =
      this._totalErrorsMapped > 0 ? this._totalDurationMs / this._totalErrorsMapped : 0;

    return Object.freeze({
      totalErrorsMapped: this._totalErrorsMapped,
      successfulMappings: this._successfulMappings,
      fallbackMappings: this._fallbackMappings,
      mappingFailures: this._mappingFailures,
      resolutionFailures: this._resolutionFailures,
      averageDurationMs: Math.round(averageDurationMs * 100) / 100,
      slowestDurationMs: Math.round(this._slowestDurationMs * 100) / 100,
      statusDistribution: Object.freeze({ ...this._statusDistribution }),
    });
  }

  public reset(): void {
    this._totalErrorsMapped = 0;
    this._successfulMappings = 0;
    this._fallbackMappings = 0;
    this._mappingFailures = 0;
    this._resolutionFailures = 0;
    this._totalDurationMs = 0;
    this._slowestDurationMs = 0;
    for (const key of Object.keys(this._statusDistribution)) {
      delete this._statusDistribution[Number(key)];
    }
  }

  private _recordDuration(durationMs: number): void {
    if (durationMs > 0) {
      this._totalDurationMs += durationMs;
      if (durationMs > this._slowestDurationMs) {
        this._slowestDurationMs = durationMs;
      }
    }
  }

  private _recordStatus(status: number): void {
    this._statusDistribution[status] = (this._statusDistribution[status] ?? 0) + 1;
  }
}
