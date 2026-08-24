import { JobRetryPolicy } from '@coreforge/contracts';

import { JobQueue } from './JobQueue';
import { JobQueueProvider } from '../provider/JobQueueProvider';
import { JobQueueOptions } from '../types/jobTypes';

export class JobQueueBuilder {
  private _provider?: JobQueueProvider | undefined;
  private _concurrency?: number | undefined;
  private _pollIntervalMs?: number | undefined;
  private _shutdownTimeoutMs?: number | undefined;
  private _defaultRetry?: JobRetryPolicy | undefined;
  private _autoStart = true;

  public setProvider(provider: JobQueueProvider): this {
    this._provider = provider;
    return this;
  }

  public setConcurrency(concurrency: number): this {
    this._concurrency = concurrency;
    return this;
  }

  public setPollIntervalMs(pollIntervalMs: number): this {
    this._pollIntervalMs = pollIntervalMs;
    return this;
  }

  public setShutdownTimeoutMs(shutdownTimeoutMs: number): this {
    this._shutdownTimeoutMs = shutdownTimeoutMs;
    return this;
  }

  public setDefaultRetry(retry: JobRetryPolicy): this {
    this._defaultRetry = retry;
    return this;
  }

  public setAutoStart(autoStart: boolean): this {
    this._autoStart = autoStart;
    return this;
  }

  public build(): JobQueue {
    const options: JobQueueOptions = {
      concurrency: this._concurrency,
      pollIntervalMs: this._pollIntervalMs,
      shutdownTimeoutMs: this._shutdownTimeoutMs,
      defaultRetry: this._defaultRetry,
      autoStart: this._autoStart,
    };

    return new JobQueue(options, this._provider);
  }
}
