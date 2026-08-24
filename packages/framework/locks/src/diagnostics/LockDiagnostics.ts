import { LockDiagnosticsSnapshot } from '@coreforge/contracts';

export class LockDiagnostics {
  private _totalAcquireAttempts = 0;
  private _successfulAcquisitions = 0;
  private _failedAcquisitions = 0;
  private _acquisitionTimeouts = 0;
  private _cancellations = 0;
  private _renewals = 0;
  private _failedRenewals = 0;
  private _releases = 0;
  private _failedReleases = 0;
  private _expirations = 0;
  private _contentionCount = 0;
  private _totalAcquireDurationMs = 0;
  private _slowestAcquireLatencyMs = 0;

  public recordAcquireAttempt(): void {
    this._totalAcquireAttempts++;
  }

  public recordSuccessfulAcquisition(durationMs: number): void {
    this._successfulAcquisitions++;
    this._recordLatency(durationMs);
  }

  public recordFailedAcquisition(durationMs: number): void {
    this._failedAcquisitions++;
    this._recordLatency(durationMs);
  }

  public recordTimeout(durationMs: number): void {
    this._acquisitionTimeouts++;
    this._recordLatency(durationMs);
  }

  public recordCancellation(): void {
    this._cancellations++;
  }

  public recordRenewal(success: boolean): void {
    if (success) {
      this._renewals++;
    } else {
      this._failedRenewals++;
    }
  }

  public recordRelease(success: boolean): void {
    if (success) {
      this._releases++;
    } else {
      this._failedReleases++;
    }
  }

  public recordExpiration(): void {
    this._expirations++;
  }

  public recordContention(): void {
    this._contentionCount++;
  }

  private _recordLatency(durationMs: number): void {
    this._totalAcquireDurationMs += durationMs;
    if (durationMs > this._slowestAcquireLatencyMs) {
      this._slowestAcquireLatencyMs = durationMs;
    }
  }

  public getSnapshot(): LockDiagnosticsSnapshot {
    const totalProcessed = this._successfulAcquisitions + this._failedAcquisitions;
    const averageAcquireLatencyMs =
      totalProcessed > 0
        ? Math.round((this._totalAcquireDurationMs / totalProcessed) * 100) / 100
        : 0;

    return Object.freeze({
      totalAcquireAttempts: this._totalAcquireAttempts,
      successfulAcquisitions: this._successfulAcquisitions,
      failedAcquisitions: this._failedAcquisitions,
      acquisitionTimeouts: this._acquisitionTimeouts,
      cancellations: this._cancellations,
      renewals: this._renewals,
      failedRenewals: this._failedRenewals,
      releases: this._releases,
      failedReleases: this._failedReleases,
      expirations: this._expirations,
      contentionCount: this._contentionCount,
      averageAcquireLatencyMs,
      slowestAcquireLatencyMs: Math.round(this._slowestAcquireLatencyMs * 100) / 100,
    });
  }

  public reset(): void {
    this._totalAcquireAttempts = 0;
    this._successfulAcquisitions = 0;
    this._failedAcquisitions = 0;
    this._acquisitionTimeouts = 0;
    this._cancellations = 0;
    this._renewals = 0;
    this._failedRenewals = 0;
    this._releases = 0;
    this._failedReleases = 0;
    this._expirations = 0;
    this._contentionCount = 0;
    this._totalAcquireDurationMs = 0;
    this._slowestAcquireLatencyMs = 0;
  }
}
