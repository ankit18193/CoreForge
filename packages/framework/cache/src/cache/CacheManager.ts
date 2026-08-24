import {
  Cache,
  CacheDiagnosticsSnapshot,
  CacheFailurePolicy,
  CacheProvider,
  CacheSerializer,
  CacheSetOptions,
} from '@coreforge/contracts';

import { CacheDiagnostics } from '../diagnostics/CacheDiagnostics';
import { CacheProviderError, CacheSerializationError } from '../errors/CacheErrors';
import { CacheExpiration } from '../expiration/CacheExpiration';
import { TtlManager } from '../expiration/TtlManager';
import { CacheProfiler } from '../internal/CacheProfiler';
import { CacheKey } from '../key/CacheKey';
import { CacheNamespace } from '../key/CacheNamespace';
import { CacheLifecycleManager } from '../lifecycle/CacheLifecycleManager';
import { NamespacedCache } from '../namespace/NamespacedCache';
import { MemoryCacheProvider } from '../provider/MemoryCacheProvider';
import { SnapshotSerializer } from '../serialization/SnapshotSerializer';
import { InFlightRequestRegistry } from '../stampede/InFlightRequestRegistry';
import { CacheOptions, CacheState } from '../types/cacheTypes';

export class CacheManager implements Cache {
  private readonly _provider: CacheProvider;
  private readonly _serializer: CacheSerializer;
  private readonly _ttlManager: TtlManager;
  private readonly _failurePolicy: CacheFailurePolicy;
  private readonly _lifecycle: CacheLifecycleManager;
  private readonly _diagnostics: CacheDiagnostics;
  private readonly _inFlight: InFlightRequestRegistry;

  constructor(options: CacheOptions = {}) {
    this._provider = options.provider ?? new MemoryCacheProvider();
    this._serializer = options.serializer ?? new SnapshotSerializer();
    this._ttlManager = new TtlManager(options.defaultTtlMs);
    this._failurePolicy = options.failurePolicy ?? 'FAIL_OPEN';
    this._lifecycle = new CacheLifecycleManager();
    this._diagnostics = new CacheDiagnostics();
    this._inFlight = new InFlightRequestRegistry();

    const autoStart = options.autoStart ?? true;
    if (autoStart) {
      this._lifecycle.start();
    }
  }

  public get state(): CacheState {
    return this._lifecycle.state;
  }

  public get provider(): CacheProvider {
    return this._provider;
  }

  public get serializer(): CacheSerializer {
    return this._serializer;
  }

  public get failurePolicy(): CacheFailurePolicy {
    return this._failurePolicy;
  }

  public get defaultTtlMs(): number | undefined {
    return this._ttlManager.defaultTtlMs;
  }

  public start(): void {
    this._lifecycle.start();
  }

  public async stop(): Promise<void> {
    this._lifecycle.stop();
    this._inFlight.clear();
    try {
      await this._provider.clear();
    } catch {
      // safe cleanup
    }
  }

  public async get<T>(key: string): Promise<T | undefined> {
    this._lifecycle.ensureOperational();
    const validatedKey = CacheKey.validate(key);
    const profiler = new CacheProfiler().start();

    try {
      const raw = await this._provider.get(validatedKey);
      if (raw === undefined) {
        this._diagnostics.recordGet(false, profiler.elapsedMs);
        return undefined;
      }

      let value: T;
      try {
        value = this._serializer.deserialize(raw) as T;
      } catch (err) {
        if (this._failurePolicy === 'FAIL_CLOSED') {
          throw new CacheSerializationError(
            `Failed to deserialize cached value for key "${validatedKey}"`,
            err,
          );
        }
        this._diagnostics.recordGet(false, profiler.elapsedMs);
        return undefined;
      }

      this._diagnostics.recordGet(true, profiler.elapsedMs);
      return value;
    } catch (err) {
      if (err instanceof CacheSerializationError) {
        throw err;
      }
      this._diagnostics.recordProviderFailure();
      if (this._failurePolicy === 'FAIL_CLOSED') {
        throw new CacheProviderError(
          `Cache provider failed during get() for key "${validatedKey}"`,
          err,
        );
      }
      this._diagnostics.recordGet(false, profiler.elapsedMs);
      return undefined;
    }
  }

  public async set<T>(key: string, value: T, options?: CacheSetOptions): Promise<void> {
    this._lifecycle.ensureOperational();
    const validatedKey = CacheKey.validate(key);
    const profiler = new CacheProfiler().start();

    let serialized: unknown;
    try {
      serialized = this._serializer.serialize(value);
    } catch (err) {
      if (this._failurePolicy === 'FAIL_CLOSED') {
        throw new CacheSerializationError(
          `Failed to serialize value for cache key "${validatedKey}"`,
          err,
        );
      }
      return;
    }

    try {
      const optionsTtlMs =
        options?.ttlMs !== undefined
          ? CacheExpiration.validateTtl(options.ttlMs)
          : this._ttlManager.defaultTtlMs;

      await this._provider.set(
        validatedKey,
        serialized,
        optionsTtlMs !== undefined ? { ttlMs: optionsTtlMs } : undefined,
      );
      this._diagnostics.recordSet(profiler.elapsedMs);
    } catch (err) {
      if (err instanceof Error && err.name === 'CacheExpirationError') {
        throw err;
      }
      this._diagnostics.recordProviderFailure();
      if (this._failurePolicy === 'FAIL_CLOSED') {
        throw new CacheProviderError(
          `Cache provider failed during set() for key "${validatedKey}"`,
          err,
        );
      }
    }
  }

  public async delete(key: string): Promise<boolean> {
    this._lifecycle.ensureOperational();
    const validatedKey = CacheKey.validate(key);
    const profiler = new CacheProfiler().start();

    try {
      const deleted = await this._provider.delete(validatedKey);
      this._diagnostics.recordDelete(profiler.elapsedMs);
      return deleted;
    } catch (err) {
      this._diagnostics.recordProviderFailure();
      if (this._failurePolicy === 'FAIL_CLOSED') {
        throw new CacheProviderError(
          `Cache provider failed during delete() for key "${validatedKey}"`,
          err,
        );
      }
      return false;
    }
  }

  public async has(key: string): Promise<boolean> {
    this._lifecycle.ensureOperational();
    const validatedKey = CacheKey.validate(key);

    try {
      return await this._provider.has(validatedKey);
    } catch (err) {
      this._diagnostics.recordProviderFailure();
      if (this._failurePolicy === 'FAIL_CLOSED') {
        throw new CacheProviderError(
          `Cache provider failed during has() for key "${validatedKey}"`,
          err,
        );
      }
      return false;
    }
  }

  public async clear(): Promise<void> {
    this._lifecycle.ensureOperational();
    try {
      await this._provider.clear();
    } catch (err) {
      this._diagnostics.recordProviderFailure();
      if (this._failurePolicy === 'FAIL_CLOSED') {
        throw new CacheProviderError('Cache provider failed during clear()', err);
      }
    }
  }

  public async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheSetOptions,
  ): Promise<T> {
    this._lifecycle.ensureOperational();
    const validatedKey = CacheKey.validate(key);

    // 1. Check existing cached value
    const existing = await this.get<T>(validatedKey);
    if (existing !== undefined) {
      return existing;
    }

    // 2. Concurrency stampede coordination
    const { promise, isNew } = this._inFlight.getOrExecute(validatedKey, async () => {
      this._diagnostics.recordFactoryExecution();
      const computed = await factory();
      await this.set<T>(validatedKey, computed, options);
      return computed;
    });

    if (!isNew) {
      this._diagnostics.recordStampedePrevention();
    }

    return promise;
  }

  public namespace(name: string): Cache {
    this._lifecycle.ensureOperational();
    const validatedNs = CacheNamespace.validate(name);
    return new NamespacedCache(this, validatedNs);
  }

  public getDiagnostics(): CacheDiagnosticsSnapshot {
    return this._diagnostics.getSnapshot();
  }

  public resetDiagnostics(): void {
    this._diagnostics.reset();
  }
}
