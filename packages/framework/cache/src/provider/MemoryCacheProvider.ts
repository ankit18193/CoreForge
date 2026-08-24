import { CacheProvider, CacheSetOptions } from '@coreforge/contracts';

import { CacheExpiration } from '../expiration/CacheExpiration';
import { CacheEntry } from '../types/cacheTypes';

export class MemoryCacheProvider implements CacheProvider {
  private readonly _entries = new Map<string, CacheEntry<unknown>>();

  public async get<T>(key: string): Promise<T | undefined> {
    const entry = this._entries.get(key);
    if (!entry) {
      return undefined;
    }

    if (CacheExpiration.isExpired(entry.expiresAt)) {
      this._entries.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  public async set<T>(key: string, value: T, options?: CacheSetOptions): Promise<void> {
    const expiresAt = CacheExpiration.calculateExpiresAt(options?.ttlMs);
    const entry: CacheEntry<T> = {
      value,
      createdAt: Date.now(),
      expiresAt,
    };
    this._entries.set(key, entry as CacheEntry<unknown>);
  }

  public async delete(key: string): Promise<boolean> {
    return this._entries.delete(key);
  }

  public async has(key: string): Promise<boolean> {
    const entry = this._entries.get(key);
    if (!entry) {
      return false;
    }

    if (CacheExpiration.isExpired(entry.expiresAt)) {
      this._entries.delete(key);
      return false;
    }

    return true;
  }

  public async clear(): Promise<void> {
    this._entries.clear();
  }

  public get size(): number {
    return this._entries.size;
  }
}
