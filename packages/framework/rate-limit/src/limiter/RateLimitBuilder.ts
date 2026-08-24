import { RateLimitProvider } from '@coreforge/contracts';

import { RateLimiterManager } from './RateLimiterManager';
import { RateLimiterOptions } from '../types/rateLimitTypes';

export class RateLimitBuilder {
  private _provider?: RateLimitProvider | undefined;
  private _defaultCost?: number | undefined;
  private _autoStart = true;

  public provider(provider: RateLimitProvider): this {
    this._provider = provider;
    return this;
  }

  public defaultCost(defaultCost: number): this {
    this._defaultCost = defaultCost;
    return this;
  }

  public autoStart(autoStart: boolean): this {
    this._autoStart = autoStart;
    return this;
  }

  public build(): RateLimiterManager {
    const options: RateLimiterOptions = {
      defaultCost: this._defaultCost,
      autoStart: this._autoStart,
    };

    return new RateLimiterManager(options, this._provider);
  }
}
