import { BulkheadPolicy } from '@coreforge/contracts';

import { BulkheadWaiter } from './BulkheadWaiter';
import {
  BulkheadConfigurationError,
  BulkheadRejectedError,
  CancellationError,
} from '../errors/ResilienceErrors';

export class Bulkhead {
  private readonly _maxConcurrent: number;
  private readonly _maxQueueSize: number;
  private _activeCount = 0;
  private readonly _queue: BulkheadWaiter[] = [];

  constructor(policy: BulkheadPolicy) {
    if (
      typeof policy.maxConcurrent !== 'number' ||
      !Number.isFinite(policy.maxConcurrent) ||
      policy.maxConcurrent <= 0
    ) {
      throw new BulkheadConfigurationError(
        'Bulkhead maxConcurrent must be a positive integer (> 0)',
        { policy },
      );
    }

    if (policy.maxQueueSize !== undefined) {
      if (
        typeof policy.maxQueueSize !== 'number' ||
        !Number.isFinite(policy.maxQueueSize) ||
        policy.maxQueueSize < 0
      ) {
        throw new BulkheadConfigurationError('Bulkhead maxQueueSize must be an integer >= 0', {
          policy,
        });
      }
    }

    this._maxConcurrent = Math.floor(policy.maxConcurrent);
    this._maxQueueSize = Math.floor(policy.maxQueueSize ?? 0);
  }

  public get activeCount(): number {
    return this._activeCount;
  }

  public get queueLength(): number {
    return this._queue.length;
  }

  public async acquire(signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) {
      throw new CancellationError('Operation was cancelled before bulkhead slot acquired');
    }

    if (this._activeCount < this._maxConcurrent) {
      this._activeCount++;
      return;
    }

    if (this._queue.length >= this._maxQueueSize) {
      throw new BulkheadRejectedError(
        `Bulkhead concurrency limit (${this._maxConcurrent}) and queue (${this._maxQueueSize}) reached`,
        {
          activeCount: this._activeCount,
          queueLength: this._queue.length,
          maxConcurrent: this._maxConcurrent,
          maxQueueSize: this._maxQueueSize,
        },
      );
    }

    return new Promise<void>((resolve, reject) => {
      const waiter: BulkheadWaiter = {
        resolve,
        reject,
        signal,
      };

      if (signal) {
        const abortHandler = (): void => {
          this._removeWaiter(waiter);
          this._cleanupWaiter(waiter);
          waiter.reject(new CancellationError('Operation was cancelled while in bulkhead queue'));
        };
        waiter.abortHandler = abortHandler;
        signal.addEventListener('abort', abortHandler, { once: true });
      }

      this._queue.push(waiter);
    });
  }

  public release(): void {
    while (this._queue.length > 0) {
      const waiter = this._queue.shift();
      if (!waiter) {
        break;
      }

      if (waiter.signal?.aborted) {
        this._cleanupWaiter(waiter);
        continue;
      }

      this._cleanupWaiter(waiter);
      waiter.resolve();
      return; // activeCount stays same
    }

    this._activeCount = Math.max(0, this._activeCount - 1);
  }

  public evacuateAll(err: Error): void {
    while (this._queue.length > 0) {
      const waiter = this._queue.shift();
      if (waiter) {
        this._cleanupWaiter(waiter);
        waiter.reject(err);
      }
    }
  }

  private _removeWaiter(waiter: BulkheadWaiter): void {
    const idx = this._queue.indexOf(waiter);
    if (idx !== -1) {
      this._queue.splice(idx, 1);
    }
  }

  private _cleanupWaiter(waiter: BulkheadWaiter): void {
    if (waiter.signal && waiter.abortHandler) {
      waiter.signal.removeEventListener('abort', waiter.abortHandler);
      waiter.abortHandler = undefined;
    }
  }
}
