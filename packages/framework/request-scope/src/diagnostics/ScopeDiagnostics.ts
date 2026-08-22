export interface ScopeDiagnosticsSnapshot {
  readonly scopesCreated: number;
  readonly scopesDisposed: number;
  readonly activeScopes: number;
  readonly peakConcurrentScopes: number;
  readonly scopedServicesResolved: number;
  readonly averageScopeLifetime: number;
  readonly averageResolutionTime: number;
  readonly averageDisposalDuration: number;
  readonly failedDisposals: number;
}

export class ScopeDiagnostics {
  private _scopesCreated = 0;
  private _scopesDisposed = 0;
  private _activeScopes = 0;
  private _peakConcurrent = 0;

  private _scopedServicesResolved = 0;
  private _totalResolutionTime = 0;

  private _totalDisposalDuration = 0;
  private _totalScopeLifetime = 0;
  private _failedDisposals = 0;

  public recordScopeCreation(): void {
    this._scopesCreated++;
    this._activeScopes++;
    if (this._activeScopes > this._peakConcurrent) {
      this._peakConcurrent = this._activeScopes;
    }
  }

  public recordResolve(duration: number): void {
    this._scopedServicesResolved++;
    this._totalResolutionTime += duration;
  }

  public recordScopeDisposal(success: boolean, duration: number, lifetime: number): void {
    this._scopesDisposed++;
    this._activeScopes--;
    this._totalDisposalDuration += duration;
    this._totalScopeLifetime += lifetime;

    if (!success) {
      this._failedDisposals++;
    }
  }

  public getSnapshot(): ScopeDiagnosticsSnapshot {
    const avgLifetime =
      this._scopesDisposed > 0 ? this._totalScopeLifetime / this._scopesDisposed : 0;
    const avgResolution =
      this._scopedServicesResolved > 0
        ? this._totalResolutionTime / this._scopedServicesResolved
        : 0;
    const avgDisposal =
      this._scopesDisposed > 0 ? this._totalDisposalDuration / this._scopesDisposed : 0;

    return {
      scopesCreated: this._scopesCreated,
      scopesDisposed: this._scopesDisposed,
      activeScopes: this._activeScopes,
      peakConcurrentScopes: this._peakConcurrent,
      scopedServicesResolved: this._scopedServicesResolved,
      averageScopeLifetime: avgLifetime,
      averageResolutionTime: avgResolution,
      averageDisposalDuration: avgDisposal,
      failedDisposals: this._failedDisposals,
    };
  }
}
