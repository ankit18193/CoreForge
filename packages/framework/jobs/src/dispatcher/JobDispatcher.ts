import { Job, JobRetryPolicy } from '@coreforge/contracts';

import { JobCancellationRegistry } from '../cancellation/JobCancellationRegistry';
import { DeadLetterQueue } from '../deadletter/DeadLetterQueue';
import { JobDiagnostics } from '../diagnostics/JobDiagnostics';
import { JobHandlerRegistry } from '../handler/JobHandlerRegistry';
import { JobProfiler } from '../internal/JobProfiler';
import { JobFactory } from '../job/JobFactory';
import { JobQueueProvider } from '../provider/JobQueueProvider';
import { JobRetryCalculator } from '../retry/JobRetryCalculator';

export interface DispatcherContext {
  handlerRegistry: JobHandlerRegistry;
  cancellationRegistry: JobCancellationRegistry;
  deadLetterQueue: DeadLetterQueue;
  diagnostics: JobDiagnostics;
  provider: JobQueueProvider;
  defaultRetry?: JobRetryPolicy | undefined;
  onJobComplete?: (job: Job) => void;
}

export class JobDispatcher {
  public static async dispatch(
    job: Job,
    context: DispatcherContext,
    optionsRetry?: JobRetryPolicy,
  ): Promise<void> {
    const {
      handlerRegistry,
      cancellationRegistry,
      deadLetterQueue,
      diagnostics,
      provider,
      defaultRetry,
      onJobComplete,
    } = context;

    // 1. Check if cancelled before execution
    if (cancellationRegistry.isCancelled(job.id)) {
      const cancelledJob = JobFactory.transition(job, 'CANCELLED');
      diagnostics.recordCancelled();
      cancellationRegistry.remove(job.id);
      onJobComplete?.(cancelledJob);
      return;
    }

    const runningJob = JobFactory.transition(job, 'RUNNING');
    const profiler = new JobProfiler().start();
    const controller = cancellationRegistry.createController(job.id);

    const handler = handlerRegistry.get(job.type);
    if (!handler) {
      const errorMsg = `No handler registered for job type "${job.type}"`;
      const deadLetterJob = JobFactory.transition(job, 'DEAD_LETTERED', {
        error: errorMsg,
      });

      deadLetterQueue.add({
        jobId: job.id,
        jobType: job.type,
        attempts: job.attempt,
        failedAt: Date.now(),
        failureMessage: errorMsg,
        failureCode: 'CF-JOB-REGISTRATION',
      });

      diagnostics.recordFailed(profiler.elapsedMs);
      diagnostics.recordDeadLettered();
      cancellationRegistry.remove(job.id);
      onJobComplete?.(deadLetterJob);
      return;
    }

    try {
      await handler.execute(job.payload, {
        job: runningJob,
        signal: controller.signal,
      });

      const completedJob = JobFactory.transition(runningJob, 'COMPLETED');
      diagnostics.recordCompleted(profiler.elapsedMs);
      cancellationRegistry.remove(job.id);
      onJobComplete?.(completedJob);
    } catch (err: unknown) {
      const isAborted = controller.signal.aborted;
      const errorMsg = err instanceof Error ? err.message : String(err);

      if (isAborted) {
        const cancelledJob = JobFactory.transition(runningJob, 'CANCELLED', {
          error: errorMsg,
        });
        diagnostics.recordCancelled();
        cancellationRegistry.remove(job.id);
        onJobComplete?.(cancelledJob);
        return;
      }

      diagnostics.recordFailed(profiler.elapsedMs);

      const effectiveRetry = optionsRetry ?? defaultRetry;
      const shouldRetry = JobRetryCalculator.shouldRetry(job.attempt, effectiveRetry);

      if (shouldRetry) {
        const delayMs = JobRetryCalculator.calculateDelayMs(job.attempt, effectiveRetry);
        const retryingJob = JobFactory.transition(runningJob, 'RETRYING', {
          error: errorMsg,
        });

        diagnostics.recordRetried();
        cancellationRegistry.remove(job.id);

        // Schedule non-blocking requeue so worker slot is released immediately
        setTimeout(async () => {
          if (!cancellationRegistry.isCancelled(job.id)) {
            const requeuedJob = JobFactory.create(
              job.type,
              job.payload,
              {
                priority: job.priority,
                retry: effectiveRetry,
                deduplicationKey: job.deduplicationKey,
              },
              job.id,
              job.createdAt,
              job.attempt + 1,
              'QUEUED',
            );

            await provider.enqueue(requeuedJob);
          } else {
            diagnostics.recordCancelled();
            cancellationRegistry.remove(job.id);
          }
        }, delayMs);

        onJobComplete?.(retryingJob);
      } else {
        const deadLetterJob = JobFactory.transition(runningJob, 'DEAD_LETTERED', {
          error: errorMsg,
        });

        deadLetterQueue.add({
          jobId: job.id,
          jobType: job.type,
          attempts: job.attempt,
          failedAt: Date.now(),
          failureMessage: errorMsg,
          failureCode: 'CF-JOB-EXECUTION',
        });

        diagnostics.recordDeadLettered();
        cancellationRegistry.remove(job.id);
        onJobComplete?.(deadLetterJob);
      }
    }
  }
}
