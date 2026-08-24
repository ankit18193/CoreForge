import { MetricLabels, MetricsProvider } from '@coreforge/contracts';

export class GaugeMetric {
  private readonly _name: string;
  private readonly _labels: MetricLabels;
  private readonly _provider: MetricsProvider;
  private readonly _onUpdate?: (() => void) | undefined;

  constructor(
    name: string,
    labels: MetricLabels,
    provider: MetricsProvider,
    onUpdate?: () => void,
  ) {
    this._name = name;
    this._labels = labels;
    this._provider = provider;
    this._onUpdate = onUpdate;
  }

  public set(value: number): void {
    this._provider.setGauge(this._name, value, this._labels);
    this._onUpdate?.();
  }

  public increment(value = 1): void {
    this._provider.incrementGauge(this._name, value, this._labels);
    this._onUpdate?.();
  }

  public decrement(value = 1): void {
    this._provider.incrementGauge(this._name, -value, this._labels);
    this._onUpdate?.();
  }
}
