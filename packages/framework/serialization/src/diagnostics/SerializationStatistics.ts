export class SerializationStatistics {
  private _totalCount = 0;
  private _failureCount = 0;
  private _totalBytesSerialized = 0;
  private _totalTime = 0;
  private _slowestDuration = 0;

  private readonly _serializerCounts = new Map<string, number>();
  private readonly _mediaTypeCounts = new Map<string, number>();

  public recordSerialization(mediaType: string, bytes: number, durationMs: number): void {
    this._totalCount++;
    this._totalBytesSerialized += bytes;
    this._totalTime += durationMs;

    this._mediaTypeCounts.set(mediaType, (this._mediaTypeCounts.get(mediaType) || 0) + 1);

    if (durationMs > this._slowestDuration) {
      this._slowestDuration = durationMs;
    }
  }

  public recordUsage(serializerName: string): void {
    this._serializerCounts.set(
      serializerName,
      (this._serializerCounts.get(serializerName) || 0) + 1,
    );
  }

  public recordFailure(): void {
    this._failureCount++;
  }

  public get totalCount(): number {
    return this._totalCount;
  }

  public get failureCount(): number {
    return this._failureCount;
  }

  public get totalBytesSerialized(): number {
    return this._totalBytesSerialized;
  }

  public get averageDurationMs(): number {
    return this._totalCount > 0 ? this._totalTime / this._totalCount : 0;
  }

  public get slowestDuration(): number {
    return this._slowestDuration;
  }

  public get serializerCounts(): ReadonlyMap<string, number> {
    return this._serializerCounts;
  }

  public get mediaTypeCounts(): ReadonlyMap<string, number> {
    return this._mediaTypeCounts;
  }
}
