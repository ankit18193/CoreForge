import {
  MetricsDiagnosticsSnapshot,
  MetricsManager as IMetricsManager,
  MetricsProvider,
} from '@coreforge/contracts';

import { Metrics } from './Metrics';
import { CardinalityManager } from '../cardinality/CardinalityManager';
import { MetricsDiagnostics } from '../diagnostics/MetricsDiagnostics';
import { MetricsLifecycleManager } from '../lifecycle/MetricsLifecycleManager';
import { MemoryMetricsProvider } from '../provider/MemoryMetricsProvider';
import { MetricsOptions, MetricsState } from '../types/metricsTypes';

export class MetricsManager implements IMetricsManager {
  private readonly _provider: MetricsProvider;
  private readonly _cardinalityManager: CardinalityManager;
  private readonly _lifecycle: MetricsLifecycleManager;
  private readonly _diagnostics: MetricsDiagnostics;

  constructor(options: MetricsOptions = {}, provider?: MetricsProvider) {
    this._provider = provider ?? new MemoryMetricsProvider();
    this._cardinalityManager = new CardinalityManager(options.maxCardinality);
    this._lifecycle = new MetricsLifecycleManager();
    this._diagnostics = new MetricsDiagnostics();

    const autoStart = options.autoStart ?? true;
    if (autoStart) {
      this._lifecycle.start();
    }
  }

  public get ready(): boolean {
    return this._lifecycle.isReady;
  }

  public get state(): MetricsState {
    return this._lifecycle.state;
  }

  public get provider(): MetricsProvider {
    return this._provider;
  }

  public async start(): Promise<void> {
    this._lifecycle.start();
  }

  public async stop(): Promise<void> {
    this._lifecycle.transitionToStopping();
    this._lifecycle.transitionToStopped();
  }

  public metrics(): Metrics {
    return new Metrics(
      this._provider,
      this._cardinalityManager,
      this._lifecycle,
      this._diagnostics,
    );
  }

  public getDiagnostics(): MetricsDiagnosticsSnapshot {
    return this._diagnostics.getSnapshot();
  }

  public resetDiagnostics(): void {
    this._diagnostics.reset();
  }
}
