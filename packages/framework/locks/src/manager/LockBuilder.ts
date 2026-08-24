import { LockProvider } from '@coreforge/contracts';

import { LockManager } from './LockManager';
import { LockManagerOptions } from '../types/lockTypes';

export class LockBuilder {
  private _provider?: LockProvider | undefined;
  private _defaultTtlMs?: number | undefined;
  private _defaultTimeoutMs?: number | undefined;
  private _autoStart = true;

  public provider(provider: LockProvider): this {
    this._provider = provider;
    return this;
  }

  public defaultTtlMs(defaultTtlMs: number): this {
    this._defaultTtlMs = defaultTtlMs;
    return this;
  }

  public defaultTimeoutMs(defaultTimeoutMs: number): this {
    this._defaultTimeoutMs = defaultTimeoutMs;
    return this;
  }

  public autoStart(autoStart: boolean): this {
    this._autoStart = autoStart;
    return this;
  }

  public build(): LockManager {
    const options: LockManagerOptions = {
      defaultTtlMs: this._defaultTtlMs,
      defaultTimeoutMs: this._defaultTimeoutMs,
      autoStart: this._autoStart,
    };

    return new LockManager(options, this._provider);
  }
}
