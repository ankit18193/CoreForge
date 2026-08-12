import { SerializationStatistics } from './SerializationStatistics';

export interface SerializationDiagnosticsSnapshot {
  readonly totalSerializations: number;
  readonly failureCount: number;
  readonly totalBytesSerialized: number;
  readonly averageSerializationTime: number;
  readonly slowestSerialization: number;
  readonly serializerCounts: Readonly<Record<string, number>>;
  readonly mediaTypeCounts: Readonly<Record<string, number>>;
}

export class SerializationDiagnostics {
  private readonly _stats: SerializationStatistics;

  constructor(stats: SerializationStatistics) {
    this._stats = stats;
  }

  public getSnapshot(): SerializationDiagnosticsSnapshot {
    const serializers: Record<string, number> = {};
    for (const [k, v] of this._stats.serializerCounts.entries()) {
      serializers[k] = v;
    }

    const mediaTypes: Record<string, number> = {};
    for (const [k, v] of this._stats.mediaTypeCounts.entries()) {
      mediaTypes[k] = v;
    }

    return {
      totalSerializations: this._stats.totalCount,
      failureCount: this._stats.failureCount,
      totalBytesSerialized: this._stats.totalBytesSerialized,
      averageSerializationTime: this._stats.averageDurationMs,
      slowestSerialization: this._stats.slowestDuration,
      serializerCounts: Object.freeze(serializers),
      mediaTypeCounts: Object.freeze(mediaTypes),
    };
  }
}
