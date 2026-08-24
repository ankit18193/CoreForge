import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { test } from 'node:test';

import {
  BulkheadRejectedError,
  CancellationError,
  CircuitOpenError,
  FallbackError,
  ResilienceBuilder,
  ResilienceManager,
  ResilienceStateError,
  RetryCalculator,
  RetryConfigurationError,
  RetryPolicyValidator,
  TimeoutError,
} from '../src/index';

test('CoreForge Resilience & Fault-Tolerance Engine (@coreforge/resilience)', async (t) => {
  await t.test(
    '1. Retry Policy Validation: Rejects invalid maxAttempts or negative delay',
    async () => {
      assert.throws(
        () => RetryPolicyValidator.validate({ maxAttempts: 0 }),
        (err: Error) => err instanceof RetryConfigurationError,
      );
      assert.throws(
        () => RetryPolicyValidator.validate({ maxAttempts: 3, baseDelayMs: -10 }),
        (err: Error) => err instanceof RetryConfigurationError,
      );
      assert.throws(
        () => RetryPolicyValidator.validate({ maxAttempts: 3, multiplier: 0.5 }),
        (err: Error) => err instanceof RetryConfigurationError,
      );
      assert.throws(
        () => RetryPolicyValidator.validate({ maxAttempts: 3, jitter: 1.5 }),
        (err: Error) => err instanceof RetryConfigurationError,
      );

      const valid = RetryPolicyValidator.validate({
        maxAttempts: 3,
        baseDelayMs: 50,
        multiplier: 2,
      });
      assert.strictEqual(valid.maxAttempts, 3);
    },
  );

  await t.test(
    '2. Exponential Backoff & Jitter: Calculates bounded delay progression',
    async () => {
      const policy = {
        maxAttempts: 4,
        baseDelayMs: 100,
        multiplier: 2,
        maxDelayMs: 500,
        jitter: 0,
      };

      assert.strictEqual(RetryCalculator.calculateDelay(1, policy), 100); // 100 * 2^0
      assert.strictEqual(RetryCalculator.calculateDelay(2, policy), 200); // 100 * 2^1
      assert.strictEqual(RetryCalculator.calculateDelay(3, policy), 400); // 100 * 2^2
      assert.strictEqual(RetryCalculator.calculateDelay(4, policy), 500); // capped at maxDelayMs
    },
  );

  await t.test(
    '3. Retry Execution: Retries up to maxAttempts and succeeds on subsequent attempt',
    async () => {
      const manager = new ResilienceManager();
      const executor = manager.executor();

      let attempts = 0;
      const result = await executor.execute(
        async () => {
          attempts++;
          if (attempts < 3) {
            throw new Error(`Transient error ${attempts}`);
          }
          return 'success';
        },
        {
          retry: { maxAttempts: 3, baseDelayMs: 5, multiplier: 1 },
        },
      );

      assert.strictEqual(result, 'success');
      assert.strictEqual(attempts, 3);

      await manager.stop();
    },
  );

  await t.test(
    '4. Failure Classification: Non-retryable error stops retry loop immediately',
    async () => {
      const manager = new ResilienceManager();
      const executor = manager.executor();

      let attempts = 0;
      await assert.rejects(
        async () =>
          executor.execute(
            async () => {
              attempts++;
              throw new TypeError('Fatal type error');
            },
            {
              retry: { maxAttempts: 5, baseDelayMs: 5 },
              shouldRetry: (err) => !(err instanceof TypeError),
            },
          ),
        (err: Error) => err instanceof TypeError,
      );

      assert.strictEqual(attempts, 1);

      await manager.stop();
    },
  );

  await t.test(
    '5. Classifier Failure Isolation: Throwing predicate is handled safely without crashing executor',
    async () => {
      const manager = new ResilienceManager();
      const executor = manager.executor();

      let attempts = 0;
      await assert.rejects(
        async () =>
          executor.execute(
            async () => {
              attempts++;
              throw new Error('Initial error');
            },
            {
              retry: { maxAttempts: 5, baseDelayMs: 5 },
              shouldRetry: () => {
                throw new Error('Classifier crash');
              },
            },
          ),
        (err: Error) => err.message === 'Initial error',
      );

      assert.strictEqual(attempts, 1);
      const diag = manager.getDiagnostics();
      assert.strictEqual(diag.classifierFailures, 1);

      await manager.stop();
    },
  );

  await t.test(
    '6. Timeout Enforcement: Aborts signal and throws TimeoutError when exceeded',
    async () => {
      const manager = new ResilienceManager();
      const executor = manager.executor();

      await assert.rejects(
        async () =>
          executor.execute(
            async (signal) => {
              return new Promise((resolve, reject) => {
                const timer = setTimeout(() => resolve('done'), 100);
                signal.addEventListener('abort', () => {
                  clearTimeout(timer);
                  reject(new Error('Operation aborted'));
                });
              });
            },
            {
              timeout: { timeoutMs: 25 },
            },
          ),
        (err: Error) => err instanceof TimeoutError,
      );

      await manager.stop();
    },
  );

  await t.test(
    '7. Caller Cancellation: Throws CancellationError and terminates retries immediately',
    async () => {
      const manager = new ResilienceManager();
      const executor = manager.executor();

      const controller = new AbortController();
      setTimeout(() => controller.abort(), 20);

      let attempts = 0;
      await assert.rejects(
        async () =>
          executor.execute(
            async () => {
              attempts++;
              await new Promise((resolve) => setTimeout(resolve, 50));
              return 'done';
            },
            {
              retry: { maxAttempts: 5, baseDelayMs: 10 },
              signal: controller.signal,
            },
          ),
        (err: Error) => err instanceof CancellationError,
      );

      assert.strictEqual(attempts, 1);

      await manager.stop();
    },
  );

  await t.test('8. Circuit Breaker: CLOSED -> OPEN after reaching failureThreshold', async () => {
    const manager = new ResilienceManager();
    const executor = manager.executor({
      circuitBreaker: { failureThreshold: 2, resetTimeoutMs: 50 },
    });

    // 1st failure
    await assert.rejects(async () =>
      executor.execute(async () => {
        throw new Error('Fail 1');
      }),
    );

    // 2nd failure -> trips circuit to OPEN
    await assert.rejects(async () =>
      executor.execute(async () => {
        throw new Error('Fail 2');
      }),
    );

    // 3rd call -> Fast rejected with CircuitOpenError without executing operation
    let ran = false;
    await assert.rejects(
      async () =>
        executor.execute(async () => {
          ran = true;
          return 'ok';
        }),
      (err: Error) => err instanceof CircuitOpenError,
    );
    assert.strictEqual(ran, false);

    await manager.stop();
  });

  await t.test('9. Circuit Breaker: OPEN -> HALF_OPEN -> CLOSED on successful probe', async () => {
    const manager = new ResilienceManager();
    const executor = manager.executor({
      circuitBreaker: { failureThreshold: 2, resetTimeoutMs: 30 },
    });

    // Trip circuit
    await assert.rejects(async () =>
      executor.execute(async () => {
        throw new Error('F1');
      }),
    );
    await assert.rejects(async () =>
      executor.execute(async () => {
        throw new Error('F2');
      }),
    );

    // Wait for resetTimeoutMs
    await new Promise((resolve) => setTimeout(resolve, 40));

    // Probe call in HALF_OPEN succeeds
    const probeResult = await executor.execute(async () => 'recovered');
    assert.strictEqual(probeResult, 'recovered');

    // Circuit is now CLOSED
    const normalResult = await executor.execute(async () => 'normal');
    assert.strictEqual(normalResult, 'normal');

    await manager.stop();
  });

  await t.test(
    '10. Bulkhead Concurrency & Queue: Limits concurrent executions and rejects overflow',
    async () => {
      const manager = new ResilienceManager();
      const executor = manager.executor({
        bulkhead: { maxConcurrent: 2, maxQueueSize: 1 },
      });

      let active = 0;
      let maxActiveSeen = 0;

      const task = async (id: number): Promise<string> => {
        return executor.execute(async () => {
          active++;
          if (active > maxActiveSeen) {
            maxActiveSeen = active;
          }
          await new Promise((resolve) => setTimeout(resolve, 30));
          active--;
          return `task-${id}`;
        });
      };

      // 2 active + 1 queued = 3 allowed, 4th must reject
      const p1 = task(1);
      const p2 = task(2);
      const p3 = task(3);
      const p4 = task(4);

      const results = await Promise.allSettled([p1, p2, p3, p4]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      assert.strictEqual(fulfilled.length, 3);
      assert.strictEqual(rejected.length, 1);
      assert.strictEqual(maxActiveSeen <= 2, true);

      const rejectedReason = (rejected[0] as PromiseRejectedResult).reason;
      assert.strictEqual(rejectedReason instanceof BulkheadRejectedError, true);

      await manager.stop();
    },
  );

  await t.test('11. Fallback Execution: Returns fallback value on operation failure', async () => {
    const manager = new ResilienceManager();
    const executor = manager.executor();

    const result = await executor.execute(
      async () => {
        throw new Error('Service down');
      },
      {
        retry: { maxAttempts: 2, baseDelayMs: 5 },
        fallback: (err) => `fallback-response: ${(err as Error).message}`,
      },
    );

    assert.strictEqual(result, 'fallback-response: Service down');

    await manager.stop();
  });

  await t.test(
    '12. Fallback Failure Isolation: Re-throws FallbackError when fallback throws',
    async () => {
      const manager = new ResilienceManager();
      const executor = manager.executor();

      await assert.rejects(
        async () =>
          executor.execute(
            async () => {
              throw new Error('Primary error');
            },
            {
              fallback: () => {
                throw new Error('Fallback failed too');
              },
            },
          ),
        (err: Error) => err instanceof FallbackError,
      );

      await manager.stop();
    },
  );

  await t.test(
    '13. Lifecycle State & Shutdown Evacuation: Rejects operations after STOPPED',
    async () => {
      const manager = new ResilienceManager({ autoStart: false });
      assert.strictEqual(manager.state, 'CREATED');
      assert.strictEqual(manager.ready, false);

      const executor = manager.executor();

      await assert.rejects(
        async () => executor.execute(async () => 'ok'),
        (err: Error) => err instanceof ResilienceStateError,
      );

      await manager.start();
      assert.strictEqual(manager.state, 'READY');
      assert.strictEqual(manager.ready, true);

      const val = await executor.execute(async () => 'val');
      assert.strictEqual(val, 'val');

      await manager.stop();
      assert.strictEqual(manager.state, 'STOPPED');

      await assert.rejects(
        async () => executor.execute(async () => 'ok'),
        (err: Error) => err instanceof ResilienceStateError,
      );
    },
  );

  await t.test(
    '14. Diagnostics Tracking: Records executions, retries, timeouts, and fallbacks',
    async () => {
      const manager = new ResilienceManager();
      const executor = manager.executor();

      await executor.execute(
        async () => {
          throw new Error('Retry then fallback');
        },
        {
          retry: { maxAttempts: 2, baseDelayMs: 5 },
          fallback: () => 'recovered',
        },
      );

      const diag = manager.getDiagnostics();
      assert.strictEqual(diag.totalExecutions, 1);
      assert.strictEqual(diag.retryCount, 1);
      assert.strictEqual(diag.fallbackExecutions, 1);
      assert.strictEqual(diag.fallbackFailures, 0);
      assert.ok(diag.averageDurationMs >= 0);

      const serialized = JSON.stringify(diag);
      assert.strictEqual(serialized.includes('Retry then fallback'), false);

      await manager.stop();
    },
  );

  await t.test(
    '15. 1,000 High-Concurrency Isolated Executions: Safe concurrent throughput',
    async () => {
      const manager = new ResilienceManager();
      const executor = manager.executor();

      const tasks: Promise<number>[] = [];
      for (let i = 0; i < 1000; i++) {
        tasks.push(executor.execute(async () => i * 2));
      }

      const results = await Promise.all(tasks);
      assert.strictEqual(results.length, 1000);
      assert.strictEqual(results[999], 1998);

      const diag = manager.getDiagnostics();
      assert.strictEqual(diag.totalExecutions, 1000);
      assert.strictEqual(diag.successfulExecutions, 1000);

      await manager.stop();
    },
  );

  await t.test(
    '16. ResilienceBuilder Fluent API: Builds customized resilience manager',
    async () => {
      const manager = new ResilienceBuilder()
        .retry({ maxAttempts: 2, baseDelayMs: 10 })
        .timeout({ timeoutMs: 500 })
        .circuitBreaker({ failureThreshold: 3, resetTimeoutMs: 100 })
        .bulkhead({ maxConcurrent: 10, maxQueueSize: 5 })
        .fallback(() => 'builder-fallback')
        .autoStart(true)
        .build();

      assert.strictEqual(manager.ready, true);

      const executor = manager.executor();
      const res = await executor.execute(async () => {
        throw new Error('Trigger builder fallback');
      });

      assert.strictEqual(res, 'builder-fallback');
      await manager.stop();
    },
  );

  await t.test(
    '17. Critical Architectural Boundary: Zero higher-layer or external broker dependencies',
    async () => {
      const pkgJsonPath = path.resolve(__dirname, '../../package.json');
      const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

      const deps = Object.keys(pkgJson.dependencies || {});
      const forbidden = [
        '@coreforge/cache',
        '@coreforge/events',
        '@coreforge/jobs',
        '@coreforge/locks',
        '@coreforge/rate-limit',
        '@coreforge/logging',
        '@coreforge/config',
        '@coreforge/runtime',
        '@coreforge/transport',
        '@coreforge/routing',
        '@coreforge/execution',
        '@coreforge/response',
        'redis',
        'ioredis',
        'express',
        'fastify',
        'rabbitmq',
        'amqplib',
      ];

      for (const f of forbidden) {
        assert.strictEqual(
          deps.includes(f),
          false,
          `Forbidden dependency detected in @coreforge/resilience: ${f}`,
        );
      }
    },
  );
});
