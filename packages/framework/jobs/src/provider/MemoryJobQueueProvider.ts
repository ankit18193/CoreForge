import { Job } from '@coreforge/contracts';

import { JobQueueProvider } from './JobQueueProvider';

interface QueuedItem {
  job: Job;
  sequence: number;
}

export class MemoryJobQueueProvider implements JobQueueProvider {
  private readonly _queue: QueuedItem[] = [];
  private readonly _jobsMap = new Map<string, Job>();
  private _sequenceCounter = 0;

  public async enqueue(job: Job): Promise<void> {
    this._sequenceCounter++;
    const item: QueuedItem = {
      job,
      sequence: this._sequenceCounter,
    };

    this._jobsMap.set(job.id, job);
    this._queue.push(item);
    this._sortQueue();
  }

  public async dequeue(): Promise<Job | undefined> {
    if (this._queue.length === 0) {
      return undefined;
    }

    const item = this._queue.shift();
    if (!item) {
      return undefined;
    }

    return item.job;
  }

  public async get(jobId: string): Promise<Job | undefined> {
    return this._jobsMap.get(jobId);
  }

  public async remove(jobId: string): Promise<boolean> {
    const existing = this._jobsMap.get(jobId);
    if (!existing) {
      return false;
    }

    this._jobsMap.delete(jobId);
    const index = this._queue.findIndex((item) => item.job.id === jobId);
    if (index !== -1) {
      this._queue.splice(index, 1);
    }
    return true;
  }

  public async size(): Promise<number> {
    return this._queue.length;
  }

  public async clear(): Promise<void> {
    this._queue.length = 0;
    this._jobsMap.clear();
  }

  private _sortQueue(): void {
    this._queue.sort((a, b) => {
      const priorityA = a.job.priority ?? 0;
      const priorityB = b.job.priority ?? 0;

      if (priorityA !== priorityB) {
        return priorityB - priorityA; // Higher priority first
      }

      if (a.job.createdAt !== b.job.createdAt) {
        return a.job.createdAt - b.job.createdAt; // Older first
      }

      return a.sequence - b.sequence; // FIFO sequence
    });
  }
}
