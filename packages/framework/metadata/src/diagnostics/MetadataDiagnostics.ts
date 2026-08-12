import { MetadataType } from '@coreforge/contracts';

export interface MetadataDiagnosticsSnapshot {
  readonly totalDescriptors: number;
  readonly descriptorsPerType: Readonly<Record<MetadataType, number>>;
  readonly cacheHits: number;
  readonly cacheMisses: number;
  readonly duplicateAttempts: number;
  readonly averageRegistrationTimeMs: number;
}

export class MetadataDiagnostics {
  private _totalDescriptors = 0;
  private readonly _descriptorsPerType = new Map<MetadataType, number>();
  private _cacheHits = 0;
  private _cacheMisses = 0;
  private _duplicateAttempts = 0;

  private _registrationTotalTimeMs = 0;
  private _registrationCount = 0;

  constructor() {
    const typesList = [
      MetadataType.MODULE,
      MetadataType.CONTROLLER,
      MetadataType.ACTION,
      MetadataType.ROUTE,
      MetadataType.PARAMETER,
      MetadataType.PROVIDER,
      MetadataType.MIDDLEWARE,
      MetadataType.INTERCEPTOR,
      MetadataType.SECURITY,
    ];
    for (const t of typesList) {
      this._descriptorsPerType.set(t, 0);
    }
  }

  public recordRegistration(type: MetadataType, durationMs: number): void {
    this._totalDescriptors++;
    this._descriptorsPerType.set(type, (this._descriptorsPerType.get(type) || 0) + 1);
    this._registrationCount++;
    this._registrationTotalTimeMs += durationMs;
  }

  public recordCacheHit(): void {
    this._cacheHits++;
  }

  public recordCacheMiss(): void {
    this._cacheMisses++;
  }

  public recordDuplicateAttempt(): void {
    this._duplicateAttempts++;
  }

  public getSnapshot(): MetadataDiagnosticsSnapshot {
    const counts: Record<string, number> = {};
    for (const [k, v] of this._descriptorsPerType.entries()) {
      counts[k] = v;
    }

    return {
      totalDescriptors: this._totalDescriptors,
      descriptorsPerType: Object.freeze(counts) as Record<MetadataType, number>,
      cacheHits: this._cacheHits,
      cacheMisses: this._cacheMisses,
      duplicateAttempts: this._duplicateAttempts,
      averageRegistrationTimeMs:
        this._registrationCount > 0 ? this._registrationTotalTimeMs / this._registrationCount : 0,
    };
  }
}
