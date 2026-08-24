import { RateLimitDiagnosticsSnapshot } from '@coreforge/contracts';

export class RateLimitDiagnostics {
  private _totalChecks = 0;
  private _allowedRequests = 0;
  private _rejectedRequests = 0;
  private _totalConsumedCost = 0;
  private _throttledRequests = 0;
  private _totalLatencyMs = 0;
  private _slowestLatencyMs = 0;

  public recordDecision(
    allowed: boolean,
    cost: number,
    durationMs: number,
    isCheckOnly = false,
  ): void {
    this._totalChecks++;
    if (allowed) {
      this._allowedRequests++;
      if (!isCheckOnly) {
        this._totalConsumedCost += cost;
      }
    } else {
      this._rejectedRequests++;
      this._throttledRequests++;
    }

    this._totalLatencyMs += durationMs;
    if (durationMs > this._slowestLatencyMs) {
      this._slowestLatencyMs = durationMs;
    }
  }

  public getSnapshot(): RateLimitDiagnosticsSnapshot {
    const averageLatencyMs =
      this._totalChecks > 0
        ? Math.round((this._totalLatencyMs / this._totalChecks) * 100) / 100
        : 0;

    return Object.freeze({
      totalChecks: this._totalChecks,
      allowedRequests: this._allowedRequests,
      rejectedRequests: this._rejectedRequests,
      totalConsumedCost: this._totalConsumedCost,
      throttledRequests: this._throttledRequests,
      averageLatencyMs,
      slowestLatencyMs: Math.round(this._slowestLatencyMs * 100) / 100,
    });
  }

  public reset(): void {
    this._totalChecks = 0;
    this._allowedRequests = 0;
    this._rejectedRequests = 0;
    this._totalConsumedCost = 0;
    this._throttledRequests = 0;
    this._totalLatencyMs = 0;
    this._slowestLatencyMs = 0;
  }
}
