import { randomUUID } from 'node:crypto';

import { Job, JobOptions, JobState } from '@coreforge/contracts';

import { JobPayloadSnapshot } from './JobPayloadSnapshot';
import { JobPayloadError } from '../errors/JobErrors';

export class JobFactory {
  public static create<T>(
    type: string,
    payload: T,
    options?: JobOptions,
    id?: string,
    createdAt?: number,
    attempt = 1,
    state: JobState = 'QUEUED',
    error?: string,
  ): Job<T> {
    if (typeof type !== 'string' || type.trim().length === 0) {
      throw new JobPayloadError('Job type must be a non-empty string', { type });
    }

    const snapshottedPayload = JobPayloadSnapshot.snapshot(payload);
    const jobId = id || randomUUID();
    const createdTimestamp = createdAt ?? Date.now();

    const job: Job<T> = {
      id: jobId,
      type: type.trim(),
      payload: snapshottedPayload,
      createdAt: createdTimestamp,
      attempt,
      state,
      priority: options?.priority,
      deduplicationKey: options?.deduplicationKey,
      error,
      retry: options?.retry,
    };

    return Object.freeze(job);
  }

  public static transition<T>(
    job: Job<T>,
    newState: JobState,
    updates?: { attempt?: number; error?: string },
  ): Job<T> {
    const updated: Job<T> = {
      id: job.id,
      type: job.type,
      payload: job.payload,
      createdAt: job.createdAt,
      attempt: updates?.attempt !== undefined ? updates.attempt : job.attempt,
      state: newState,
      priority: job.priority,
      deduplicationKey: job.deduplicationKey,
      error: updates?.error !== undefined ? updates.error : job.error,
      retry: job.retry,
    };

    return Object.freeze(updated);
  }
}
