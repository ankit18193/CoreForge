import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { test } from 'node:test';

import {
  DeadLetterQueue,
  JobFactory,
  JobPayloadError,
  JobQueue,
  JobQueueBuilder,
  JobRegistrationError,
  JobRetryCalculator,
  JobRetryError,
  JobStateError,
  MemoryJobQueueProvider,
} from '../src/index';

test('CoreForge Background Jobs & Task Queue Engine (@coreforge/jobs)', async (t) => {
  await t.test(
    '1. Job Creation: Generates unique IDs, timestamp, and immutable snapshots',
    async () => {
      const job1 = JobFactory.create('SendEmail', { to: 'user1@example.com' });
      const job2 = JobFactory.create('SendEmail', { to: 'user2@example.com' });

      assert.ok(job1.id);
      assert.ok(job2.id);
      assert.notStrictEqual(job1.id, job2.id);
      assert.strictEqual(job1.type, 'SendEmail');
      assert.strictEqual(job1.state, 'QUEUED');
      assert.strictEqual(job1.attempt, 1);
      assert.ok(job1.createdAt > 0);
    },
  );

  await t.test(
    '2. Payload Immutability: Mutating producer payload does not affect queued job',
    async () => {
      const original = { data: { count: 1 } };
      const job = JobFactory.create('ProcessData', original);

      original.data.count = 999;
      assert.strictEqual((job.payload as typeof original).data.count, 1);
    },
  );

  await t.test(
    '3. Circular Reference Handling: Replaces cycles with [Circular] safely',
    async () => {
      const circular: Record<string, unknown> = { name: 'cycle' };
      circular.self = circular;

      const job = JobFactory.create('CyclicJob', circular);
      const payload = job.payload as Record<string, unknown>;
      assert.strictEqual(payload.name, 'cycle');
      assert.strictEqual(payload.self, '[Circular]');
    },
  );

  await t.test('4. Type Validation: Rejects empty or whitespace-only job types', async () => {
    assert.throws(
      () => JobFactory.create('', { data: 1 }),
      (err: Error) => err instanceof JobPayloadError,
    );
    assert.throws(
      () => JobFactory.create('   ', { data: 1 }),
      (err: Error) => err instanceof JobPayloadError,
    );
  });

  await t.test('5. Handler Registration: Registers handler and rejects duplicates', async () => {
    const queue = new JobQueue({ autoStart: false });

    queue.register('TaskA', {
      execute: async () => {},
    });

    assert.throws(
      () =>
        queue.register('TaskA', {
          execute: async () => {},
        }),
      (err: Error) => err instanceof JobRegistrationError,
    );
  });

  await t.test(
    '6. Registration After Start: Rejects handler registration once queue starts',
    async () => {
      const queue = new JobQueue({ autoStart: true });

      assert.throws(
        () =>
          queue.register('LateTask', {
            execute: async () => {},
          }),
        (err: Error) => err instanceof JobRegistrationError,
      );

      await queue.stop();
    },
  );

  await t.test('7. Priority Ordering: Higher priority jobs dequeue first', async () => {
    const provider = new MemoryJobQueueProvider();
    const jobLow = JobFactory.create('Job', { level: 'low' }, { priority: 0 });
    const jobHigh = JobFactory.create('Job', { level: 'high' }, { priority: 100 });
    const jobMed = JobFactory.create('Job', { level: 'med' }, { priority: 50 });

    await provider.enqueue(jobLow);
    await provider.enqueue(jobHigh);
    await provider.enqueue(jobMed);

    const first = await provider.dequeue();
    const second = await provider.dequeue();
    const third = await provider.dequeue();

    assert.strictEqual(first?.priority, 100);
    assert.strictEqual(second?.priority, 50);
    assert.strictEqual(third?.priority, 0);
  });

  await t.test('8. FIFO Ordering for Equal Priority: Dequeues in arrival order', async () => {
    const provider = new MemoryJobQueueProvider();
    const job1 = JobFactory.create('Job', { seq: 1 }, { priority: 10 });
    const job2 = JobFactory.create('Job', { seq: 2 }, { priority: 10 });
    const job3 = JobFactory.create('Job', { seq: 3 }, { priority: 10 });

    await provider.enqueue(job1);
    await provider.enqueue(job2);
    await provider.enqueue(job3);

    const first = await provider.dequeue();
    const second = await provider.dequeue();
    const third = await provider.dequeue();

    assert.strictEqual((first?.payload as { seq: number }).seq, 1);
    assert.strictEqual((second?.payload as { seq: number }).seq, 2);
    assert.strictEqual((third?.payload as { seq: number }).seq, 3);
  });

  await t.test('9. Execution & Completion: Worker processes job to COMPLETED state', async () => {
    const queue = new JobQueue({ autoStart: false });
    let processedPayload: unknown = null;

    queue.register('SimpleTask', {
      execute: async (payload: unknown) => {
        processedPayload = payload;
      },
    });

    queue.start();
    await queue.enqueue('SimpleTask', { text: 'test-data' });

    await new Promise((resolve) => setTimeout(resolve, 50));
    await queue.stop();

    assert.deepStrictEqual(processedPayload, { text: 'test-data' });
    const diag = await queue.getDiagnostics();
    assert.strictEqual(diag.totalCompleted, 1);
  });

  await t.test('10. Concurrency Control: Never exceeds configured concurrency limit', async () => {
    let maxActive = 0;
    let active = 0;

    const queue = new JobQueueBuilder()
      .setConcurrency(3)
      .setPollIntervalMs(5)
      .setAutoStart(false)
      .build();

    queue.register('ConcurrentTask', {
      execute: async () => {
        active++;
        if (active > maxActive) {
          maxActive = active;
        }
        await new Promise((resolve) => setTimeout(resolve, 30));
        active--;
      },
    });

    queue.start();

    for (let i = 0; i < 10; i++) {
      await queue.enqueue('ConcurrentTask', { idx: i });
    }

    await new Promise((resolve) => setTimeout(resolve, 150));
    await queue.stop();

    assert.ok(maxActive <= 3, `Max active (${maxActive}) exceeded concurrency limit (3)`);
    assert.ok(maxActive > 1, `Max active (${maxActive}) should be > 1`);
  });

  await t.test(
    '11. Retry Policy: Retries failed job with exponential backoff up to maxAttempts',
    async () => {
      const queue = new JobQueue({
        autoStart: false,
        pollIntervalMs: 5,
      });

      let attempts = 0;

      queue.register('FailingTask', {
        execute: async () => {
          attempts++;
          if (attempts < 3) {
            throw new Error('Transient error');
          }
        },
      });

      queue.start();
      await queue.enqueue(
        'FailingTask',
        { data: 'retry-test' },
        {
          retry: {
            maxAttempts: 3,
            backoffMs: 10,
            backoffMultiplier: 2,
          },
        },
      );

      await new Promise((resolve) => setTimeout(resolve, 250));
      await queue.stop();

      assert.strictEqual(attempts, 3);
      const diag = await queue.getDiagnostics();
      assert.strictEqual(diag.totalCompleted, 1);
      assert.strictEqual(diag.totalRetried, 2);
    },
  );

  await t.test('12. Dead Letter Queue: Exhausted retries move job to DEAD_LETTERED', async () => {
    const queue = new JobQueue({
      autoStart: false,
      pollIntervalMs: 5,
    });

    let attempts = 0;

    queue.register('AlwaysFails', {
      execute: async () => {
        attempts++;
        throw new Error('Permanent failure');
      },
    });

    queue.start();
    await queue.enqueue(
      'AlwaysFails',
      { id: 99 },
      {
        retry: {
          maxAttempts: 2,
          backoffMs: 5,
        },
      },
    );

    await new Promise((resolve) => setTimeout(resolve, 80));
    await queue.stop();

    assert.strictEqual(attempts, 2);
    const deadLetters = queue.getDeadLetters();
    assert.strictEqual(deadLetters.length, 1);
    assert.strictEqual(deadLetters[0].jobType, 'AlwaysFails');
    assert.strictEqual(deadLetters[0].failureMessage, 'Permanent failure');

    const diag = await queue.getDiagnostics();
    assert.strictEqual(diag.totalDeadLettered, 1);
    assert.strictEqual(diag.totalCompleted, 0);
  });

  await t.test('13. Failure Isolation: One job failure does not affect other jobs', async () => {
    const queue = new JobQueue({ autoStart: false, pollIntervalMs: 5 });
    const completed: string[] = [];

    queue.register('Task', {
      execute: async (payload: { id: string; shouldFail?: boolean }) => {
        if (payload.shouldFail) {
          throw new Error('Boom');
        }
        completed.push(payload.id);
      },
    });

    queue.start();
    await queue.enqueue('Task', { id: 'job-1' });
    await queue.enqueue('Task', { id: 'job-2', shouldFail: true });
    await queue.enqueue('Task', { id: 'job-3' });

    await new Promise((resolve) => setTimeout(resolve, 80));
    await queue.stop();

    assert.deepStrictEqual(completed, ['job-1', 'job-3']);
  });

  await t.test('14. Cancellation Before Execution: Marked CANCELLED and not executed', async () => {
    const queue = new JobQueue({ autoStart: false });
    let executed = false;

    queue.register('CancelMe', {
      execute: async () => {
        executed = true;
      },
    });

    queue.start();
    const job = await queue.enqueue('CancelMe', { data: 1 });
    const cancelled = await queue.cancel(job.id);
    assert.strictEqual(cancelled, true);

    await new Promise((resolve) => setTimeout(resolve, 40));
    await queue.stop();

    assert.strictEqual(executed, false);
    const diag = await queue.getDiagnostics();
    assert.strictEqual(diag.totalCancelled, 1);
  });

  await t.test('15. Running Job Cancellation: Propagates AbortSignal to handler', async () => {
    const queue = new JobQueue({ autoStart: false, pollIntervalMs: 5 });
    let wasAborted = false;

    queue.register('LongJob', {
      execute: async (_payload: unknown, { signal }: { signal: AbortSignal }) => {
        await new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, 100);
          signal.addEventListener('abort', () => {
            clearTimeout(timer);
            wasAborted = true;
            reject(new Error('Aborted'));
          });
        });
      },
    });

    queue.start();
    const job = await queue.enqueue('LongJob', {});
    await new Promise((resolve) => setTimeout(resolve, 15));

    await queue.cancel(job.id);
    await new Promise((resolve) => setTimeout(resolve, 50));
    await queue.stop();

    assert.strictEqual(wasAborted, true);
    const diag = await queue.getDiagnostics();
    assert.strictEqual(diag.totalCancelled, 1);
  });

  await t.test(
    '16. Deduplication: Prevents duplicate active jobs with same deduplicationKey',
    async () => {
      const queue = new JobQueue({ autoStart: false });
      queue.register('DedupTask', { execute: async () => {} });
      queue.start();

      const job1 = await queue.enqueue(
        'DedupTask',
        { val: 1 },
        { deduplicationKey: 'user-sync-100' },
      );
      const job2 = await queue.enqueue(
        'DedupTask',
        { val: 2 },
        { deduplicationKey: 'user-sync-100' },
      );

      assert.strictEqual(job1.id, job2.id); // Reused identical job instance
      await queue.stop();
    },
  );

  await t.test(
    '17. Deduplication Key Reusable After Completion: Allows new enqueue after finish',
    async () => {
      const queue = new JobQueue({ autoStart: false, pollIntervalMs: 5 });
      let count = 0;

      queue.register('DedupTask', {
        execute: async () => {
          count++;
        },
      });

      queue.start();
      const job1 = await queue.enqueue('DedupTask', { val: 1 }, { deduplicationKey: 'k-1' });

      await new Promise((resolve) => setTimeout(resolve, 40));
      assert.strictEqual(count, 1);

      // Enqueue again with same key after first job completed
      const job2 = await queue.enqueue('DedupTask', { val: 2 }, { deduplicationKey: 'k-1' });
      assert.notStrictEqual(job1.id, job2.id);

      await new Promise((resolve) => setTimeout(resolve, 40));
      await queue.stop();

      assert.strictEqual(count, 2);
    },
  );

  await t.test('18. Lifecycle Transitions: CREATED -> READY -> STOPPING -> STOPPED', async () => {
    const queue = new JobQueue({ autoStart: false });
    assert.strictEqual(queue.state, 'CREATED');

    queue.start();
    assert.strictEqual(queue.state, 'READY');

    // Idempotent start
    queue.start();
    assert.strictEqual(queue.state, 'READY');

    await queue.stop();
    assert.strictEqual(queue.state, 'STOPPED');

    // Idempotent stop
    await queue.stop();
    assert.strictEqual(queue.state, 'STOPPED');
  });

  await t.test(
    '19. Lifecycle Enforcement: Rejects enqueue before READY and after STOPPED',
    async () => {
      const unstarted = new JobQueue({ autoStart: false });
      await assert.rejects(
        async () => unstarted.enqueue('Task', {}),
        (err: Error) => err instanceof JobStateError,
      );

      const stopped = new JobQueue();
      await stopped.stop();

      await assert.rejects(
        async () => stopped.enqueue('Task', {}),
        (err: Error) => err instanceof JobStateError,
      );
    },
  );

  await t.test(
    '20. Graceful Shutdown Draining: In-flight jobs complete within shutdown timeout',
    async () => {
      const queue = new JobQueue({ autoStart: false, pollIntervalMs: 5 });
      let finished = false;

      queue.register('DrainTask', {
        execute: async () => {
          await new Promise((resolve) => setTimeout(resolve, 30));
          finished = true;
        },
      });

      queue.start();
      await queue.enqueue('DrainTask', {});
      await new Promise((resolve) => setTimeout(resolve, 10));

      await queue.stop(500);
      assert.strictEqual(finished, true);
    },
  );

  await t.test(
    '21. Diagnostics Security: Tracks metrics without storing payloads or credentials',
    async () => {
      const queue = new JobQueue({ autoStart: false, pollIntervalMs: 5 });
      queue.register('MetricTask', { execute: async () => {} });

      queue.start();
      await queue.enqueue('MetricTask', { secretToken: 'SUPER_SECRET_123' });
      await new Promise((resolve) => setTimeout(resolve, 30));
      await queue.stop();

      const diag = await queue.getDiagnostics();
      assert.strictEqual(diag.totalEnqueued, 1);
      assert.strictEqual(diag.totalCompleted, 1);
      assert.ok(diag.averageDurationMs >= 0);

      const serialized = JSON.stringify(diag);
      assert.strictEqual(serialized.includes('SUPER_SECRET_123'), false);
      assert.strictEqual(serialized.includes('secretToken'), false);
    },
  );

  await t.test('22. 1,000 High-Concurrency Jobs: Safely processes high-load queues', async () => {
    const queue = new JobQueueBuilder()
      .setConcurrency(20)
      .setPollIntervalMs(2)
      .setAutoStart(false)
      .build();
    let completedCount = 0;

    queue.register('BulkJob', {
      execute: async () => {
        completedCount++;
      },
    });

    queue.start();

    const tasks: Promise<unknown>[] = [];
    for (let i = 0; i < 1000; i++) {
      tasks.push(queue.enqueue('BulkJob', { i }));
    }
    await Promise.all(tasks);

    // Wait for all 1,000 to process
    let retries = 0;
    while (completedCount < 1000 && retries < 100) {
      await new Promise((resolve) => setTimeout(resolve, 20));
      retries++;
    }

    await queue.stop();
    assert.strictEqual(completedCount, 1000);
    const diag = await queue.getDiagnostics();
    assert.strictEqual(diag.totalCompleted, 1000);
  });

  await t.test(
    '23. Instance Isolation: Multiple JobQueue instances operate with zero cross-talk',
    async () => {
      const queueA = new JobQueue({ autoStart: false, pollIntervalMs: 5 });
      const queueB = new JobQueue({ autoStart: false, pollIntervalMs: 5 });

      let countA = 0;
      let countB = 0;

      queueA.register('IsolatedTask', {
        execute: async () => {
          countA++;
        },
      });
      queueB.register('IsolatedTask', {
        execute: async () => {
          countB++;
        },
      });

      queueA.start();
      queueB.start();

      await queueA.enqueue('IsolatedTask', {});
      await queueA.enqueue('IsolatedTask', {});
      await queueB.enqueue('IsolatedTask', {});

      await new Promise((resolve) => setTimeout(resolve, 50));
      await queueA.stop();
      await queueB.stop();

      assert.strictEqual(countA, 2);
      assert.strictEqual(countB, 1);
    },
  );

  await t.test('24. JobQueueBuilder Fluent API: Builds custom configured queue', async () => {
    const customProvider = new MemoryJobQueueProvider();
    const queue = new JobQueueBuilder()
      .setProvider(customProvider)
      .setConcurrency(8)
      .setPollIntervalMs(15)
      .setShutdownTimeoutMs(3000)
      .setDefaultRetry({ maxAttempts: 4, backoffMs: 50 })
      .setAutoStart(false)
      .build();

    assert.strictEqual(queue.provider, customProvider);
    assert.strictEqual(queue.concurrency, 8);
    assert.strictEqual(queue.state, 'CREATED');
  });

  await t.test(
    '25. Critical Architectural Boundary: Zero higher-layer or external broker dependencies',
    async () => {
      const pkgJsonPath = path.resolve(__dirname, '../../package.json');
      const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

      const deps = Object.keys(pkgJson.dependencies || {});
      const forbidden = [
        '@coreforge/cache',
        '@coreforge/events',
        '@coreforge/logging',
        '@coreforge/config',
        '@coreforge/runtime',
        '@coreforge/transport',
        '@coreforge/routing',
        '@coreforge/execution',
        '@coreforge/response',
        'redis',
        'ioredis',
        'bullmq',
        'bull',
        'amqplib',
        'kafkajs',
      ];

      for (const f of forbidden) {
        assert.strictEqual(
          deps.includes(f),
          false,
          `Forbidden dependency detected in @coreforge/jobs: ${f}`,
        );
      }
    },
  );

  await t.test('26. Retry Policy Validation: Rejects invalid retry policy values', async () => {
    assert.throws(
      () => JobRetryCalculator.validatePolicy({ maxAttempts: 0 }),
      (err: Error) => err instanceof JobRetryError,
    );
    assert.throws(
      () => JobRetryCalculator.validatePolicy({ maxAttempts: 3, backoffMs: -5 }),
      (err: Error) => err instanceof JobRetryError,
    );
    assert.throws(
      () => JobRetryCalculator.validatePolicy({ maxAttempts: 3, backoffMultiplier: 0.5 }),
      (err: Error) => err instanceof JobRetryError,
    );
    assert.throws(
      () => JobRetryCalculator.validatePolicy({ maxAttempts: 3, maxBackoffMs: -10 }),
      (err: Error) => err instanceof JobRetryError,
    );
  });

  await t.test(
    '27. DeadLetterQueue Standalone: Manages dead letter entries and listings',
    async () => {
      const dlq = new DeadLetterQueue();
      dlq.add({
        jobId: 'job-dlq-1',
        jobType: 'TestJob',
        attempts: 3,
        failedAt: Date.now(),
        failureMessage: 'Test failure',
      });

      assert.strictEqual(dlq.size, 1);
      assert.ok(dlq.get('job-dlq-1'));
      assert.strictEqual(dlq.list().length, 1);

      dlq.clear();
      assert.strictEqual(dlq.size, 0);
    },
  );
});
