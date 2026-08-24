import { CacheDiagnosticsSnapshot } from '@coreforge/contracts';

export class CacheDiagnostics {
  private _totalGets = 0;
  private _hits = 0;
  private _misses = 0;
  private _sets = 0;
  private _deletes = 0;
  private _expirations = 0;
  private _providerFailures = 0;
  private _factoryExecutions = 0;
  private _stampedePreventions = 0;
  private _totalLatencyMs = 0;
  private _totalOperations = 0;
  private _slowestLatencyMs = 0;

  public recordGet(hit: boolean, latencyMs: number): void {
    this._totalGets++;
    if (hit) {
      this._hits++;
    } else {
      this._misses++;
    }
    this._recordLatency(latencyMs);
  }

  public recordSet(latencyMs: number): void {
    this._sets++;
    this._recordLatency(latencyMs);
  }

  public recordDelete(latencyMs: number): void {
    this._deletes++;
    this._recordLatency(latencyMs);
  }

  public recordExpiration(): void {
    this._expirations++;
  }

  public recordProviderFailure(): void {
    this._providerFailures++;
  }

  public recordFactoryExecution(): void {
    this._factoryExecutions++;
  }

  public recordStampedePrevention(): void {
    this._stampedePreventions++;
  }

  private _recordLatency(latencyMs: number): void {
    this._totalOperations++;
    this._totalLatencyMs += latencyMs;
    if (latencyMs > this._slowestLatencyMs) {
      this._slowestLatencyMs = latencyMs;
    }
  }

  public getSnapshot(): CacheDiagnosticsSnapshot {
    const averageLatencyMs =
      this._totalOperations > 0
        ? Math.round((this._totalLatencyMs / this._totalOperations) * 100) / 100
        : 0;

    return Object.freeze({
      totalGets: this._totalGets,
      hits: this._hits,
      misses: this._misses,
      sets: this._sets,
      deletes: this._deletes,
      expirations: this._expirations,
      providerFailures: this._providerFailures,
      factoryExecutions: this._factoryExecutions,
      stampedePreventions: this._stampedePreventions,
      averageLatencyMs,
      slowestLatencyMs: Math.round(this._slowestLatencyMs * 100) / 100,
    });
  }

  public reset(): void {
    this._totalGets = 0;
    this._hits = 0;
    this._misses = 0;
    this._sets = 0;
    this._deletes = 0;
    this._expirations = 0;
    this._providerFailures = 0;
    this._factoryExecutions = 0;
    this._stampedePreventions = 0;
    this._totalLatencyMs = 0;
    this._totalOperations = 0;
    this._slowestLatencyMs = 0;
  }
}
