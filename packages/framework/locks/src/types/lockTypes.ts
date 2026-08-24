import {
  Lock,
  LockAcquireOptions,
  LockDiagnosticsSnapshot,
  LockLease,
  LockManager as ILockManager,
  LockProvider,
} from '@coreforge/contracts';

export type {
  Lock,
  LockAcquireOptions,
  LockDiagnosticsSnapshot,
  LockLease,
  ILockManager,
  LockProvider,
};

export type LockState = 'CREATED' | 'READY' | 'STOPPING' | 'STOPPED';

export interface LockManagerOptions {
  readonly defaultTtlMs?: number | undefined;
  readonly defaultTimeoutMs?: number | undefined;
  readonly autoStart?: boolean | undefined;
}
