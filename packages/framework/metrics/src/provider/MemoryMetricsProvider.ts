import {
  MetricDefinition,
  MetricLabels as IMetricLabels,
  MetricSnapshot,
  MetricsProvider,
} from '@coreforge/contracts';

import { MetricValueError } from '../errors/MetricsErrors';
import { MetricLabelValidator } from '../key/MetricLabels';
import { MetricName } from '../key/MetricName';
import { DEFAULT_HISTOGRAM_BUCKETS, MetricRegistry } from '../registry/MetricRegistry';

interface CounterEntry {
  name: string;
  labels: IMetricLabels;
  value: number;
}

interface GaugeEntry {
  name: string;
  labels: IMetricLabels;
  value: number;
}

interface HistogramEntry {
  name: string;
  labels: IMetricLabels;
  count: number;
  sum: number;
  bucketCounts: Map<number, number>; // boundary -> cumulative count
}

export class MemoryMetricsProvider implements MetricsProvider {
  private readonly _registry: MetricRegistry;
  private readonly _counters = new Map<string, CounterEntry>();
  private readonly _gauges = new Map<string, GaugeEntry>();
  private readonly _histograms = new Map<string, HistogramEntry>();

  constructor(registry?: MetricRegistry) {
    this._registry = registry ?? new MetricRegistry();
  }

  public get registry(): MetricRegistry {
    return this._registry;
  }

  public register(definition: MetricDefinition): void {
    this._registry.register(definition);
  }

  public incrementCounter(name: string, value = 1, labels?: IMetricLabels): void {
    const validName = MetricName.validate(name);
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new MetricValueError('Counter increment value must be a non-negative number (>= 0)', {
        name,
        value,
      });
    }

    const validLabels = MetricLabelValidator.validate(labels);
    this._registry.register({ name: validName, type: 'COUNTER' });

    const key = this._composeCompoundKey(validName, validLabels);
    let entry = this._counters.get(key);
    if (!entry) {
      entry = { name: validName, labels: validLabels, value: 0 };
      this._counters.set(key, entry);
    }
    entry.value += value;
  }

  public setGauge(name: string, value: number, labels?: IMetricLabels): void {
    const validName = MetricName.validate(name);
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new MetricValueError('Gauge value must be a finite number', { name, value });
    }

    const validLabels = MetricLabelValidator.validate(labels);
    this._registry.register({ name: validName, type: 'GAUGE' });

    const key = this._composeCompoundKey(validName, validLabels);
    let entry = this._gauges.get(key);
    if (!entry) {
      entry = { name: validName, labels: validLabels, value: 0 };
      this._gauges.set(key, entry);
    }
    entry.value = value;
  }

  public incrementGauge(name: string, value = 1, labels?: IMetricLabels): void {
    const validName = MetricName.validate(name);
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new MetricValueError('Gauge increment delta must be a finite number', { name, value });
    }

    const validLabels = MetricLabelValidator.validate(labels);
    this._registry.register({ name: validName, type: 'GAUGE' });

    const key = this._composeCompoundKey(validName, validLabels);
    let entry = this._gauges.get(key);
    if (!entry) {
      entry = { name: validName, labels: validLabels, value: 0 };
      this._gauges.set(key, entry);
    }
    entry.value += value;
  }

  public observeHistogram(name: string, value: number, labels?: IMetricLabels): void {
    const validName = MetricName.validate(name);
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new MetricValueError('Histogram observation must be a non-negative number (>= 0)', {
        name,
        value,
      });
    }

    const validLabels = MetricLabelValidator.validate(labels);
    const def =
      this._registry.get(validName) ??
      this._registry.register({ name: validName, type: 'HISTOGRAM' });
    const buckets = def.histogram?.buckets ?? DEFAULT_HISTOGRAM_BUCKETS;

    const key = this._composeCompoundKey(validName, validLabels);
    let entry = this._histograms.get(key);
    if (!entry) {
      entry = {
        name: validName,
        labels: validLabels,
        count: 0,
        sum: 0,
        bucketCounts: new Map<number, number>(),
      };
      for (const b of buckets) {
        entry.bucketCounts.set(b, 0);
      }
      this._histograms.set(key, entry);
    }

    entry.count++;
    entry.sum += value;

    for (const b of buckets) {
      if (value <= b) {
        const current = entry.bucketCounts.get(b) ?? 0;
        entry.bucketCounts.set(b, current + 1);
      }
    }
  }

  public async snapshot(): Promise<readonly MetricSnapshot[]> {
    const snapshots: MetricSnapshot[] = [];

    // 1. Counters
    for (const entry of this._counters.values()) {
      snapshots.push(
        Object.freeze({
          name: entry.name,
          type: 'COUNTER',
          labels: entry.labels,
          value: entry.value,
        }),
      );
    }

    // 2. Gauges
    for (const entry of this._gauges.values()) {
      snapshots.push(
        Object.freeze({
          name: entry.name,
          type: 'GAUGE',
          labels: entry.labels,
          value: entry.value,
        }),
      );
    }

    // 3. Histograms / Timers
    for (const entry of this._histograms.values()) {
      const def = this._registry.get(entry.name);
      const buckets = def?.histogram?.buckets ?? DEFAULT_HISTOGRAM_BUCKETS;
      const bucketRecord: Record<string, number> = {};

      for (const b of buckets) {
        bucketRecord[String(b)] = entry.bucketCounts.get(b) ?? 0;
      }
      bucketRecord['+Inf'] = entry.count;

      snapshots.push(
        Object.freeze({
          name: entry.name,
          type: def?.type ?? 'HISTOGRAM',
          labels: entry.labels,
          value: entry.sum,
          count: entry.count,
          sum: entry.sum,
          buckets: Object.freeze(bucketRecord),
        }),
      );
    }

    return Object.freeze(snapshots);
  }

  public async reset(name?: string): Promise<void> {
    if (name) {
      const validName = MetricName.validate(name);
      for (const [key, entry] of this._counters) {
        if (entry.name === validName) {
          this._counters.delete(key);
        }
      }
      for (const [key, entry] of this._gauges) {
        if (entry.name === validName) {
          this._gauges.delete(key);
        }
      }
      for (const [key, entry] of this._histograms) {
        if (entry.name === validName) {
          this._histograms.delete(key);
        }
      }
    } else {
      this._counters.clear();
      this._gauges.clear();
      this._histograms.clear();
    }
  }

  public async clear(): Promise<void> {
    this._counters.clear();
    this._gauges.clear();
    this._histograms.clear();
    this._registry.clear();
  }

  private _composeCompoundKey(name: string, labels: IMetricLabels): string {
    const serialized = MetricLabelValidator.serialize(labels);
    return `${name}#${serialized}`;
  }
}
