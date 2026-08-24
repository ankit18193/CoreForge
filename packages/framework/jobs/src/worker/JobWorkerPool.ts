import { Job, JobRetryPolicy } from '@coreforge/contracts';

import { JobCancellationRegistry } from '../cancellation/JobCancellationRegistry';
import { DeadLetterQueue } from '../deadletter/DeadLetterQueue';
import { JobDiagnostics } from '../diagnostics/JobDiagnostics';
import { JobDispatcher } from '../dispatcher/JobDispatcher';
import { JobHandlerRegistry } from '../handler/JobHandlerRegistry';
import { JobQueueProvider } from '../provider/JobQueueProvider';
import { WorkerOptions } from '../types/jobTypes';

export class JobWorkerPool {
  private readonly _provider: JobQueueProvider;
  private readonly _handlerRegistry: JobHandlerRegistry;
  private readonly _cancellationRegistry: JobCancellationRegistry;
  private readonly _deadLetterQueue: DeadLetterQueue;
  private readonly _diagnostics: JobDiagnostics;
  private readonly _concurrency: number;
  private readonly _pollIntervalMs: number;
  private readonly _defaultRetry?: JobRetryPolicy | undefined;
  private readonly _onJobProcessed?: ((job: Job) => void) | undefined;

  private readonly _activeJobs = new Map<string, Job>();
  private _running = false;
  private _pollTimer?: NodeJS.Timeout | undefined;
  private _drainResolvers: (() => void)[] = [];

  constructor(
    provider: JobQueueProvider,
    handlerRegistry: JobHandlerRegistry,
    cancellationRegistry: JobCancellationRegistry,
    deadLetterQueue: DeadLetterQueue,
    diagnostics: JobDiagnostics,
    options: WorkerOptions = {},
    defaultRetry?: JobRetryPolicy,
    onJobProcessed?: (job: Job) => void,
  ) {
    this._provider = provider;
    this._handlerRegistry = handlerRegistry;
    this._cancellationRegistry = cancellationRegistry;
    this._deadLetterQueue = deadLetterQueue;
    this._diagnostics = diagnostics;
    this._concurrency = Math.max(1, options.concurrency ?? 5);
    this._pollIntervalMs = Math.max(1, options.pollIntervalMs ?? 10);
    this._defaultRetry = defaultRetry;
    this._onJobProcessed = onJobProcessed;
  }

  public get concurrency(): number {
    return this._concurrency;
  }

  public get activeCount(): number {
    return this._activeJobs.size;
  }

  public get isRunning(): boolean {
    return this._running;
  }

  public start(): void {
    if (this._running) {
      return;
    }
    this._running = true;
    this._schedulePump(0);
  }

  public notifyNewJob(): void {
    if (this._running) {
      this._schedulePump(0);
    }
  }

  public async stop(timeoutMs = 5000): Promise<void> {
    this._running = false;
    if (this._pollTimer) {
      clearTimeout(this._pollTimer);
      this._pollTimer = undefined;
    }

    if (this._activeJobs.size === 0) {
      return;
    }

    const drainPromise = new Promise<void>((resolve) => {
      this._drainResolvers.push(resolve);
    });

    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(() => {
        // Abort remaining active jobs on timeout
        for (const jobId of this._activeJobs.keys()) {
          this._cancellationRegistry.cancel(jobId);
        }
        resolve();
      }, timeoutMs);
    });

    await Promise.race([drainPromise, timeoutPromise]);
  }

  private _schedulePump(delayMs = this._pollIntervalMs): void {
    if (!this._running) {
      return;
    }

    if (this._pollTimer) {
      clearTimeout(this._pollTimer);
    }

    this._pollTimer = setTimeout(() => {
      this._pump().catch(() => {});
    }, delayMs);
  }

  private async _pump(): Promise<void> {
    if (!this._running) {
      return;
    }

    while (this._running && this._activeJobs.size < this._concurrency) {
      const job = await this._provider.dequeue();
      if (!job) {
        // Queue is empty, schedule next poll
        this._schedulePump(this._pollIntervalMs);
        return;
      }

      this._activeJobs.set(job.id, job);

      // Dispatch job asynchronously
      JobDispatcher.dispatch(
        job,
        {
          handlerRegistry: this._handlerRegistry,
          cancellationRegistry: this._cancellationRegistry,
          deadLetterQueue: this._deadLetterQueue,
          diagnostics: this._diagnostics,
          provider: this._provider,
          defaultRetry: this._defaultRetry,
          onJobComplete: (processedJob) => {
            this._onJobProcessed?.(processedJob);
          },
        },
        job.retry,
      )
        .catch(() => {})
        .finally(() => {
          this._activeJobs.delete(job.id);
          this._checkDrain();
          if (this._running) {
            this._schedulePump(0);
          }
        });
    }
  }

  private _checkDrain(): void {
    if (this._activeJobs.size === 0 && this._drainResolvers.length > 0) {
      const resolvers = [...this._drainResolvers];
      this._drainResolvers = [];
      for (const resolve of resolvers) {
        resolve();
      }
    }
  }
}
