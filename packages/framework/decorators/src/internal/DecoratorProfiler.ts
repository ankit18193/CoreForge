export class DecoratorProfiler {
  private _startTime = 0;
  private readonly _collectionCounts = new Map<string, number>();
  private _totalCollectionTime = 0;
  private _validationTime = 0;
  private _finalizationTime = 0;

  public start(): void {
    this._startTime = Date.now();
  }

  public get durationMs(): number {
    if (this._startTime === 0) {
      return 0;
    }
    return Date.now() - this._startTime;
  }

  public recordCollection(type: string, durationMs: number): void {
    const current = this._collectionCounts.get(type) || 0;
    this._collectionCounts.set(type, current + 1);
    this._totalCollectionTime += durationMs;
  }

  public recordValidation(durationMs: number): void {
    this._validationTime += durationMs;
  }

  public recordFinalization(durationMs: number): void {
    this._finalizationTime += durationMs;
  }

  public getSnapshot(): {
    totalCollections: number;
    collectionTimeMs: number;
    validationTimeMs: number;
    finalizationTimeMs: number;
    countsByType: Readonly<Record<string, number>>;
  } {
    let total = 0;
    const counts: Record<string, number> = {};
    for (const [k, v] of this._collectionCounts.entries()) {
      counts[k] = v;
      total += v;
    }
    return {
      totalCollections: total,
      collectionTimeMs: this._totalCollectionTime,
      validationTimeMs: this._validationTime,
      finalizationTimeMs: this._finalizationTime,
      countsByType: Object.freeze(counts),
    };
  }

  public reset(): void {
    this._startTime = 0;
    this._collectionCounts.clear();
    this._totalCollectionTime = 0;
    this._validationTime = 0;
    this._finalizationTime = 0;
  }
}
