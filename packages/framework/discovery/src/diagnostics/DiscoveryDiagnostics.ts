import { MetadataType } from '@coreforge/contracts';

export interface DiscoveryDiagnosticsSnapshot {
  readonly discoveryDurationMs: number;
  readonly modulesDiscovered: number;
  readonly controllersDiscovered: number;
  readonly providersDiscovered: number;
  readonly routesDiscovered: number;
  readonly middlewareDiscovered: number;
  readonly interceptorsDiscovered: number;
  readonly securityEntriesDiscovered: number;
  readonly dependencyGraphSize: number;
  readonly orphanCount: number;
  readonly cycleCount: number;
}

export class DiscoveryDiagnostics {
  private _durationMs = 0;
  private readonly _counts = new Map<MetadataType, number>();
  private _graphSize = 0;
  private _orphanCount = 0;
  private _cycleCount = 0;

  constructor() {
    const list = [
      MetadataType.MODULE,
      MetadataType.CONTROLLER,
      MetadataType.PROVIDER,
      MetadataType.ROUTE,
      MetadataType.MIDDLEWARE,
      MetadataType.INTERCEPTOR,
      MetadataType.SECURITY,
    ];
    for (const t of list) {
      this._counts.set(t, 0);
    }
  }

  public recordCounts(type: MetadataType, count: number): void {
    this._counts.set(type, count);
  }

  public recordDuration(durationMs: number): void {
    this._durationMs = durationMs;
  }

  public recordGraphMetrics(size: number, orphans: number, cycles: number): void {
    this._graphSize = size;
    this._orphanCount = orphans;
    this._cycleCount = cycles;
  }

  public getSnapshot(): DiscoveryDiagnosticsSnapshot {
    return {
      discoveryDurationMs: this._durationMs,
      modulesDiscovered: this._counts.get(MetadataType.MODULE) || 0,
      controllersDiscovered: this._counts.get(MetadataType.CONTROLLER) || 0,
      providersDiscovered: this._counts.get(MetadataType.PROVIDER) || 0,
      routesDiscovered: this._counts.get(MetadataType.ROUTE) || 0,
      middlewareDiscovered: this._counts.get(MetadataType.MIDDLEWARE) || 0,
      interceptorsDiscovered: this._counts.get(MetadataType.INTERCEPTOR) || 0,
      securityEntriesDiscovered: this._counts.get(MetadataType.SECURITY) || 0,
      dependencyGraphSize: this._graphSize,
      orphanCount: this._orphanCount,
      cycleCount: this._cycleCount,
    };
  }
}
