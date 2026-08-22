import { DiagnosticsSnapshot } from '../types/dependencyTypes';

export class DependencyDiagnostics {
  private _providerCount = 0;
  private _resolutionCount = 0;
  private _cacheHits = 0;
  private _cacheMisses = 0;
  private _singletonCount = 0;
  private _requestScopedCount = 0;
  private _transientCount = 0;
  private _resolutionFailures = 0;
  private _circularDependencyFailures = 0;
  private _totalResolutionDurationMs = 0;
  private _slowestResolutionDurationMs = 0;
  private _slowestToken: string | undefined = undefined;
  private _totalLifecycleHookDurationMs = 0;

  public recordProviderRegistration(): void {
    this._providerCount++;
  }

  public recordResolution(
    tokenName: string,
    durationMs: number,
    cached: boolean,
    scope: string,
  ): void {
    this._resolutionCount++;
    this._totalResolutionDurationMs += durationMs;

    if (cached) {
      this._cacheHits++;
    } else {
      this._cacheMisses++;
      if (scope === 'SINGLETON') {
        this._singletonCount++;
      } else if (scope === 'REQUEST') {
        this._requestScopedCount++;
      } else if (scope === 'TRANSIENT') {
        this._transientCount++;
      }
    }

    if (durationMs > this._slowestResolutionDurationMs) {
      this._slowestResolutionDurationMs = durationMs;
      this._slowestToken = tokenName;
    }
  }

  public recordResolutionFailure(): void {
    this._resolutionFailures++;
  }

  public recordCircularDependencyFailure(): void {
    this._circularDependencyFailures++;
    this._resolutionFailures++;
  }

  public recordLifecycleHookDuration(durationMs: number): void {
    this._totalLifecycleHookDurationMs += durationMs;
  }

  public snapshot(): DiagnosticsSnapshot {
    const avgDuration =
      this._resolutionCount > 0 ? this._totalResolutionDurationMs / this._resolutionCount : 0;

    const snap: DiagnosticsSnapshot = {
      providerCount: this._providerCount,
      resolutionCount: this._resolutionCount,
      cacheHits: this._cacheHits,
      cacheMisses: this._cacheMisses,
      singletonCount: this._singletonCount,
      requestScopedCount: this._requestScopedCount,
      transientCount: this._transientCount,
      resolutionFailures: this._resolutionFailures,
      circularDependencyFailures: this._circularDependencyFailures,
      averageResolutionDurationMs: Number(avgDuration.toFixed(4)),
      slowestResolutionDurationMs: Number(this._slowestResolutionDurationMs.toFixed(4)),
      slowestToken: this._slowestToken,
      totalLifecycleHookDurationMs: Number(this._totalLifecycleHookDurationMs.toFixed(4)),
      timestamp: Date.now(),
    };

    return Object.freeze(snap);
  }
}
