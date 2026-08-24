import { LockLease, LockProvider } from '@coreforge/contracts';

import { LockAcquisitionWaiter } from './LockAcquisitionWaiter';
import { LockAcquisitionTimeoutError, LockCancellationError } from '../errors/LockErrors';

export class LockAcquisitionManager {
  private readonly _waiters = new Map<string, LockAcquisitionWaiter[]>();

  public async waitForLock(
    key: string,
    ttlMs: number,
    timeoutMs?: number,
    signal?: AbortSignal,
  ): Promise<LockLease> {
    if (signal?.aborted) {
      throw new LockCancellationError('Lock acquisition was cancelled before waiting', {
        key,
      });
    }

    return new Promise<LockLease>((resolve, reject) => {
      const waiter: LockAcquisitionWaiter = {
        key,
        ttlMs,
        resolve,
        reject,
        signal,
      };

      if (timeoutMs !== undefined && timeoutMs > 0) {
        waiter.timeoutTimer = setTimeout(() => {
          this._removeWaiter(waiter);
          this._cleanupWaiter(waiter);
          waiter.reject(
            new LockAcquisitionTimeoutError(`Lock acquisition timed out after ${timeoutMs}ms`, {
              key,
              timeoutMs,
            }),
          );
        }, timeoutMs);
      }

      if (signal) {
        const abortHandler = (): void => {
          this._removeWaiter(waiter);
          this._cleanupWaiter(waiter);
          waiter.reject(
            new LockCancellationError('Lock acquisition was cancelled via AbortSignal', {
              key,
            }),
          );
        };
        waiter.abortHandler = abortHandler;
        signal.addEventListener('abort', abortHandler, { once: true });
      }

      let list = this._waiters.get(key);
      if (!list) {
        list = [];
        this._waiters.set(key, list);
      }
      list.push(waiter);
    });
  }

  public async notifyAvailable(key: string, provider: LockProvider): Promise<void> {
    const list = this._waiters.get(key);
    if (!list || list.length === 0) {
      return;
    }

    while (list.length > 0) {
      const waiter = list.shift();
      if (!waiter) {
        break;
      }

      // Check if waiter was cancelled/timed out in the meantime
      if (waiter.signal?.aborted) {
        this._cleanupWaiter(waiter);
        continue;
      }

      try {
        const lease = await provider.acquire(waiter.key, waiter.ttlMs);
        if (lease) {
          this._cleanupWaiter(waiter);
          waiter.resolve(lease);
          if (list.length === 0) {
            this._waiters.delete(key);
          }
          return;
        } else {
          // Could not acquire, put back at head of queue
          list.unshift(waiter);
          return;
        }
      } catch (err: unknown) {
        this._cleanupWaiter(waiter);
        waiter.reject(err instanceof Error ? err : new Error(String(err)));
      }
    }

    if (list.length === 0) {
      this._waiters.delete(key);
    }
  }

  public evacuateAll(err: Error): void {
    for (const [, list] of this._waiters) {
      for (const waiter of list) {
        this._cleanupWaiter(waiter);
        waiter.reject(err);
      }
    }
    this._waiters.clear();
  }

  private _removeWaiter(waiter: LockAcquisitionWaiter): void {
    const list = this._waiters.get(waiter.key);
    if (!list) {
      return;
    }

    const index = list.indexOf(waiter);
    if (index !== -1) {
      list.splice(index, 1);
    }

    if (list.length === 0) {
      this._waiters.delete(waiter.key);
    }
  }

  private _cleanupWaiter(waiter: LockAcquisitionWaiter): void {
    if (waiter.timeoutTimer) {
      clearTimeout(waiter.timeoutTimer);
      waiter.timeoutTimer = undefined;
    }

    if (waiter.signal && waiter.abortHandler) {
      waiter.signal.removeEventListener('abort', waiter.abortHandler);
      waiter.abortHandler = undefined;
    }
  }

  public get pendingCount(): number {
    let count = 0;
    for (const list of this._waiters.values()) {
      count += list.length;
    }
    return count;
  }
}
