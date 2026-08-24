import { Cache, CacheSetOptions } from '@coreforge/contracts';

import { CacheNamespace } from '../key/CacheNamespace';

export class NamespacedCache implements Cache {
  private readonly _parent: Cache;
  private readonly _namespace: string;

  constructor(parent: Cache, namespace: string) {
    this._parent = parent;
    this._namespace = CacheNamespace.validate(namespace);
  }

  public get namespaceName(): string {
    return this._namespace;
  }

  public async get<T>(key: string): Promise<T | undefined> {
    const canonicalKey = CacheNamespace.composeKey(this._namespace, key);
    return this._parent.get<T>(canonicalKey);
  }

  public async set<T>(key: string, value: T, options?: CacheSetOptions): Promise<void> {
    const canonicalKey = CacheNamespace.composeKey(this._namespace, key);
    return this._parent.set<T>(canonicalKey, value, options);
  }

  public async delete(key: string): Promise<boolean> {
    const canonicalKey = CacheNamespace.composeKey(this._namespace, key);
    return this._parent.delete(canonicalKey);
  }

  public async has(key: string): Promise<boolean> {
    const canonicalKey = CacheNamespace.composeKey(this._namespace, key);
    return this._parent.has(canonicalKey);
  }

  public async clear(): Promise<void> {
    return this._parent.clear();
  }

  public async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheSetOptions,
  ): Promise<T> {
    const canonicalKey = CacheNamespace.composeKey(this._namespace, key);
    return this._parent.getOrSet<T>(canonicalKey, factory, options);
  }

  public namespace(name: string): Cache {
    const subNs = CacheNamespace.validate(name);
    return new NamespacedCache(this._parent, `${this._namespace}:${subNs}`);
  }
}
