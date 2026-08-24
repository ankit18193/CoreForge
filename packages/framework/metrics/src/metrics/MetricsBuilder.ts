import { MetricsProvider } from '@coreforge/contracts';

import { MetricsManager } from './MetricsManager';
import { MetricsOptions } from '../types/metricsTypes';

export class MetricsBuilder {
  private _provider?: MetricsProvider | undefined;
  private _maxCardinality?: number | undefined;
  private _autoStart = true;

  public provider(provider: MetricsProvider): this {
    this._provider = provider;
    return this;
  }

  public maxCardinality(maxCardinality: number): this {
    this._maxCardinality = maxCardinality;
    return this;
  }

  public autoStart(autoStart: boolean): this {
    this._autoStart = autoStart;
    return this;
  }

  public build(): MetricsManager {
    const options: MetricsOptions = {
      maxCardinality: this._maxCardinality,
      autoStart: this._autoStart,
    };

    return new MetricsManager(options, this._provider);
  }
}
