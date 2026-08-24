import {
  Cache as ICache,
  CacheDiagnosticsSnapshot,
  CacheFailurePolicy,
  CacheProvider,
  CacheSerializer,
  CacheSetOptions,
} from '@coreforge/contracts';

export type {
  ICache,
  CacheDiagnosticsSnapshot,
  CacheFailurePolicy,
  CacheProvider,
  CacheSerializer,
  CacheSetOptions,
};

export type CacheState = 'CREATED' | 'READY' | 'STOPPING' | 'STOPPED';

export interface CacheOptions {
  readonly provider?: CacheProvider | undefined;
  readonly serializer?: CacheSerializer | undefined;
  readonly defaultTtlMs?: number | undefined;
  readonly failurePolicy?: CacheFailurePolicy | undefined;
  readonly autoStart?: boolean | undefined;
}

export interface CacheEntry<T = unknown> {
  readonly value: T;
  readonly createdAt: number;
  readonly expiresAt?: number | undefined;
}
