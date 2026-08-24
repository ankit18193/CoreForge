import { CacheFailurePolicy, CacheProvider, CacheSerializer } from '@coreforge/contracts';

import { CacheManager } from './CacheManager';
import { CacheOptions } from '../types/cacheTypes';

export class CacheBuilder {
  private _provider?: CacheProvider | undefined;
  private _serializer?: CacheSerializer | undefined;
  private _defaultTtlMs?: number | undefined;
  private _failurePolicy?: CacheFailurePolicy | undefined;
  private _autoStart = true;

  public setProvider(provider: CacheProvider): this {
    this._provider = provider;
    return this;
  }

  public setSerializer(serializer: CacheSerializer): this {
    this._serializer = serializer;
    return this;
  }

  public setDefaultTtlMs(defaultTtlMs: number): this {
    this._defaultTtlMs = defaultTtlMs;
    return this;
  }

  public setFailurePolicy(policy: CacheFailurePolicy): this {
    this._failurePolicy = policy;
    return this;
  }

  public setAutoStart(autoStart: boolean): this {
    this._autoStart = autoStart;
    return this;
  }

  public build(): CacheManager {
    const options: CacheOptions = {
      provider: this._provider,
      serializer: this._serializer,
      defaultTtlMs: this._defaultTtlMs,
      failurePolicy: this._failurePolicy,
      autoStart: this._autoStart,
    };

    return new CacheManager(options);
  }
}
