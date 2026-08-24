import { LockLease } from '@coreforge/contracts';

export interface LockAcquisitionWaiter {
  readonly key: string;
  readonly ttlMs: number;
  readonly resolve: (lease: LockLease) => void;
  readonly reject: (err: Error) => void;
  timeoutTimer?: NodeJS.Timeout | undefined;
  abortHandler?: (() => void) | undefined;
  signal?: AbortSignal | undefined;
}
