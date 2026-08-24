import {
  Job,
  JobDiagnosticsSnapshot,
  JobHandler,
  JobOptions,
  JobQueue as IJobQueue,
} from '@coreforge/contracts';

import { JobCancellationRegistry } from '../cancellation/JobCancellationRegistry';
import { DeadLetterQueue } from '../deadletter/DeadLetterQueue';
import { JobDiagnostics } from '../diagnostics/JobDiagnostics';
import { JobHandlerRegistry } from '../handler/JobHandlerRegistry';
import { JobFactory } from '../job/JobFactory';
import { JobLifecycleManager } from '../lifecycle/JobLifecycleManager';
import { JobQueueProvider } from '../provider/JobQueueProvider';
import { MemoryJobQueueProvider } from '../provider/MemoryJobQueueProvider';
import { DeadLetterEntry, JobQueueOptions, JobQueueState } from '../types/jobTypes';
import { JobWorkerPool } from '../worker/JobWorkerPool';

export class JobQueue implements IJobQueue {
  private readonly _provider: JobQueueProvider;
  private readonly _handlerRegistry: JobHandlerRegistry;
  private readonly _cancellationRegistry: JobCancellationRegistry;
  private readonly _deadLetterQueue: DeadLetterQueue;
  private readonly _lifecycle: JobLifecycleManager;
  private readonly _diagnostics: JobDiagnostics;
  private readonly _workerPool: JobWorkerPool;
  private readonly _deduplicationRegistry = new Map<string, string>();

  constructor(options: JobQueueOptions = {}, provider?: JobQueueProvider) {
    this._provider = provider ?? new MemoryJobQueueProvider();
    this._handlerRegistry = new JobHandlerRegistry();
    this._cancellationRegistry = new JobCancellationRegistry();
    this._deadLetterQueue = new DeadLetterQueue();
    this._lifecycle = new JobLifecycleManager();
    this._diagnostics = new JobDiagnostics();

    this._workerPool = new JobWorkerPool(
      this._provider,
      this._handlerRegistry,
      this._cancellationRegistry,
      this._deadLetterQueue,
      this._diagnostics,
      options,
      options.defaultRetry,
      (job) => {
        if (
          job.state === 'COMPLETED' ||
          job.state === 'DEAD_LETTERED' ||
          job.state === 'CANCELLED'
        ) {
          if (job.deduplicationKey) {
            this._deduplicationRegistry.delete(job.deduplicationKey);
          }
        }
      },
    );

    const autoStart = options.autoStart ?? true;
    if (autoStart) {
      this.start();
    }
  }

  public get state(): JobQueueState {
    return this._lifecycle.state;
  }

  public get provider(): JobQueueProvider {
    return this._provider;
  }

  public get concurrency(): number {
    return this._workerPool.concurrency;
  }

  public get activeJobsCount(): number {
    return this._workerPool.activeCount;
  }

  public start(): void {
    this._lifecycle.start();
    this._handlerRegistry.lock();
    this._workerPool.start();
  }

  public async stop(timeoutMs = 5000): Promise<void> {
    this._lifecycle.transitionToStopping();
    await this._workerPool.stop(timeoutMs);
    this._lifecycle.transitionToStopped();
    this._cancellationRegistry.clear();
    this._deduplicationRegistry.clear();
    try {
      await this._provider.clear();
    } catch {
      // safe cleanup
    }
  }

  public register<T>(type: string, handler: JobHandler<T>): void {
    this._handlerRegistry.register(type, handler);
  }

  public async enqueue<T>(type: string, payload: T, options?: JobOptions): Promise<Job<T>> {
    this._lifecycle.ensureOperational();

    if (options?.deduplicationKey) {
      const existingJobId = this._deduplicationRegistry.get(options.deduplicationKey);
      if (existingJobId) {
        const existingJob = await this._provider.get(existingJobId);
        if (existingJob) {
          return existingJob as Job<T>;
        }
      }
    }

    const job = JobFactory.create(type, payload, options);

    if (options?.deduplicationKey) {
      this._deduplicationRegistry.set(options.deduplicationKey, job.id);
    }

    await this._provider.enqueue(job);
    this._diagnostics.recordEnqueue();
    this._workerPool.notifyNewJob();

    return job;
  }

  public async cancel(jobId: string): Promise<boolean> {
    this._lifecycle.ensureOperational();
    const isRunning = this._cancellationRegistry.isRunning(jobId);
    const cancelled = this._cancellationRegistry.cancel(jobId);
    const removed = await this._provider.remove(jobId);
    if (!isRunning && removed) {
      this._diagnostics.recordCancelled();
    }
    return cancelled;
  }

  public async get(jobId: string): Promise<Job | undefined> {
    this._lifecycle.ensureOperational();
    return this._provider.get(jobId);
  }

  public async getDiagnostics(): Promise<JobDiagnosticsSnapshot> {
    const queuedCount = await this._provider.size();
    const activeCount = this._workerPool.activeCount;
    return this._diagnostics.getSnapshot(activeCount, queuedCount);
  }

  public getDeadLetters(): readonly DeadLetterEntry[] {
    return this._deadLetterQueue.list();
  }

  public resetDiagnostics(): void {
    this._diagnostics.reset();
  }
}
