import { MetricLabels, MetricTimer, MetricsProvider } from '@coreforge/contracts';

export class TimerMetric implements MetricTimer {
  private readonly _name: string;
  private readonly _labels: MetricLabels;
  private readonly _provider: MetricsProvider;
  private readonly _startTime: bigint;
  private _stopped = false;
  private readonly _onStop?: ((durationMs: number) => void) | undefined;

  constructor(
    name: string,
    labels: MetricLabels,
    provider: MetricsProvider,
    onStop?: (durationMs: number) => void,
  ) {
    this._name = name;
    this._labels = labels;
    this._provider = provider;
    this._startTime = process.hrtime.bigint();
    this._onStop = onStop;
  }

  public stop(): number {
    if (this._stopped) {
      return 0; // Double-stop protection
    }
    this._stopped = true;

    const diff = process.hrtime.bigint() - this._startTime;
    const durationMs = Number(diff) / 1_000_000;

    this._provider.observeHistogram(this._name, durationMs, this._labels);
    this._onStop?.(durationMs);

    return durationMs;
  }
}
