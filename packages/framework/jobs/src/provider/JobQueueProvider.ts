import { Job } from '@coreforge/contracts';

export interface JobQueueProvider {
  enqueue(job: Job): Promise<void>;
  dequeue(): Promise<Job | undefined>;
  get(jobId: string): Promise<Job | undefined>;
  remove(jobId: string): Promise<boolean>;
  size(): Promise<number>;
  clear(): Promise<void>;
}
