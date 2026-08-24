import { MetricCardinalityError, MetricsConfigurationError } from '../errors/MetricsErrors';

export class CardinalityManager {
  private readonly _maxCardinality: number;
  private readonly _labelSetsByMetric = new Map<string, Set<string>>();

  constructor(maxCardinality = 1000) {
    if (
      typeof maxCardinality !== 'number' ||
      !Number.isFinite(maxCardinality) ||
      maxCardinality <= 0
    ) {
      throw new MetricsConfigurationError('maxCardinality must be a positive integer (> 0)', {
        maxCardinality,
      });
    }
    this._maxCardinality = Math.floor(maxCardinality);
  }

  public get maxCardinality(): number {
    return this._maxCardinality;
  }

  public assertOrTrack(metricName: string, serializedLabels: string): void {
    if (!serializedLabels) {
      return; // No labels does not consume cardinality slots
    }

    let set = this._labelSetsByMetric.get(metricName);
    if (!set) {
      set = new Set<string>();
      this._labelSetsByMetric.set(metricName, set);
    }

    if (set.has(serializedLabels)) {
      return; // Existing combination always allowed
    }

    if (set.size >= this._maxCardinality) {
      throw new MetricCardinalityError(
        `Cardinality limit (${this._maxCardinality}) exceeded for metric "${metricName}"`,
        { metricName, maxCardinality: this._maxCardinality },
      );
    }

    set.add(serializedLabels);
  }

  public getCount(metricName: string): number {
    return this._labelSetsByMetric.get(metricName)?.size ?? 0;
  }

  public reset(metricName?: string): void {
    if (metricName) {
      this._labelSetsByMetric.delete(metricName);
    } else {
      this._labelSetsByMetric.clear();
    }
  }

  public clear(): void {
    this._labelSetsByMetric.clear();
  }
}
