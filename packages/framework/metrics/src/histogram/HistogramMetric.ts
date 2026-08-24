import { MetricLabels, MetricsProvider } from '@coreforge/contracts';

export class HistogramMetric {
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

  public observe(value: number): void {
    this._provider.observeHistogram(this._name, value, this._labels);
    this._onUpdate?.();
  }
}
