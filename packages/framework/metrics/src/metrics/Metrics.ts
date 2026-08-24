import {
  MetricDefinition,
  MetricLabels as IMetricLabels,
  MetricSnapshot,
  MetricTimer,
  Metrics as IMetrics,
  MetricsProvider,
} from '@coreforge/contracts';

import { CardinalityManager } from '../cardinality/CardinalityManager';
import { CounterMetric } from '../counter/CounterMetric';
import { MetricsDiagnostics } from '../diagnostics/MetricsDiagnostics';
import { GaugeMetric } from '../gauge/GaugeMetric';
import { HistogramMetric } from '../histogram/HistogramMetric';
import { MetricLabelValidator } from '../key/MetricLabels';
import { MetricName } from '../key/MetricName';
import { MetricsLifecycleManager } from '../lifecycle/MetricsLifecycleManager';
import { TimerMetric } from '../timer/TimerMetric';

export class Metrics implements IMetrics {
  private readonly _provider: MetricsProvider;
  private readonly _cardinalityManager: CardinalityManager;
  private readonly _lifecycle: MetricsLifecycleManager;
  private readonly _diagnostics: MetricsDiagnostics;

  constructor(
    provider: MetricsProvider,
    cardinalityManager: CardinalityManager,
    lifecycle: MetricsLifecycleManager,
    diagnostics: MetricsDiagnostics,
  ) {
    this._provider = provider;
    this._cardinalityManager = cardinalityManager;
    this._lifecycle = lifecycle;
    this._diagnostics = diagnostics;
  }

  public register(definition: MetricDefinition): void {
    this._lifecycle.ensureOperational();
    try {
      this._provider.register(definition);
      this._diagnostics.recordRegistration(true);
    } catch (err: unknown) {
      this._diagnostics.recordRegistration(false);
      throw err;
    }
  }

  public counter(
    name: string,
    labels?: IMetricLabels,
  ): {
    increment(value?: number): void;
  } {
    this._lifecycle.ensureOperational();
    const validName = MetricName.validate(name);
    const validLabels = MetricLabelValidator.validate(labels);
    const serialized = MetricLabelValidator.serialize(validLabels);

    try {
      this._cardinalityManager.assertOrTrack(validName, serialized);
    } catch (cardErr: unknown) {
      this._diagnostics.recordCardinalityRejection();
      throw cardErr;
    }

    return new CounterMetric(validName, validLabels, this._provider, () =>
      this._diagnostics.recordCounterUpdate(),
    );
  }

  public gauge(
    name: string,
    labels?: IMetricLabels,
  ): {
    set(value: number): void;
    increment(value?: number): void;
    decrement(value?: number): void;
  } {
    this._lifecycle.ensureOperational();
    const validName = MetricName.validate(name);
    const validLabels = MetricLabelValidator.validate(labels);
    const serialized = MetricLabelValidator.serialize(validLabels);

    try {
      this._cardinalityManager.assertOrTrack(validName, serialized);
    } catch (cardErr: unknown) {
      this._diagnostics.recordCardinalityRejection();
      throw cardErr;
    }

    return new GaugeMetric(validName, validLabels, this._provider, () =>
      this._diagnostics.recordGaugeUpdate(),
    );
  }

  public histogram(
    name: string,
    labels?: IMetricLabels,
  ): {
    observe(value: number): void;
  } {
    this._lifecycle.ensureOperational();
    const validName = MetricName.validate(name);
    const validLabels = MetricLabelValidator.validate(labels);
    const serialized = MetricLabelValidator.serialize(validLabels);

    try {
      this._cardinalityManager.assertOrTrack(validName, serialized);
    } catch (cardErr: unknown) {
      this._diagnostics.recordCardinalityRejection();
      throw cardErr;
    }

    return new HistogramMetric(validName, validLabels, this._provider, () =>
      this._diagnostics.recordHistogramObservation(),
    );
  }

  public timer(name: string, labels?: IMetricLabels): MetricTimer {
    this._lifecycle.ensureOperational();
    const validName = MetricName.validate(name);
    const validLabels = MetricLabelValidator.validate(labels);
    const serialized = MetricLabelValidator.serialize(validLabels);

    try {
      this._cardinalityManager.assertOrTrack(validName, serialized);
    } catch (cardErr: unknown) {
      this._diagnostics.recordCardinalityRejection();
      throw cardErr;
    }

    return new TimerMetric(validName, validLabels, this._provider, (durationMs) =>
      this._diagnostics.recordTimerObservation(durationMs),
    );
  }

  public async snapshot(): Promise<readonly MetricSnapshot[]> {
    this._lifecycle.ensureOperational();
    return this._provider.snapshot();
  }

  public async reset(name?: string): Promise<void> {
    this._lifecycle.ensureOperational();
    await this._provider.reset(name);
    this._cardinalityManager.reset(name);
  }

  public async clear(): Promise<void> {
    this._lifecycle.ensureOperational();
    await this._provider.clear();
    this._cardinalityManager.clear();
  }
}
