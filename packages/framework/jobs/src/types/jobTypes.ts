import {
  Job,
  JobDiagnosticsSnapshot,
  JobExecutionContext,
  JobHandler,
  JobOptions,
  JobQueue as IJobQueue,
  JobRetryPolicy,
  JobState,
} from '@coreforge/contracts';

export type {
  Job,
  JobDiagnosticsSnapshot,
  JobExecutionContext,
  JobHandler,
  JobOptions,
  IJobQueue,
  JobRetryPolicy,
  JobState,
};

export type JobQueueState = 'CREATED' | 'READY' | 'STOPPING' | 'STOPPED';

export interface WorkerOptions {
  readonly concurrency?: number | undefined;
  readonly pollIntervalMs?: number | undefined;
  readonly shutdownTimeoutMs?: number | undefined;
}

export interface JobQueueOptions extends WorkerOptions {
  readonly defaultRetry?: JobRetryPolicy | undefined;
  readonly autoStart?: boolean | undefined;
}

export interface DeadLetterEntry {
  readonly jobId: string;
  readonly jobType: string;
  readonly attempts: number;
  readonly failedAt: number;
  readonly failureMessage: string;
  readonly failureCode?: string | undefined;
}
