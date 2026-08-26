import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { test } from 'node:test';

import { ExecutionContextManager } from '@coreforge/execution-context';

import {
  Interceptor,
  InterceptorBuilder,
  InterceptorContinuationError,
  InterceptorEngine,
  InterceptorRegistrationError,
  InterceptorStateError,
} from '../src/index';

test('CoreForge Application Middleware & Interceptor Infrastructure (@coreforge/interceptors)', async (t) => {
  await t.test(
    '1. Lifecycle: Rejects execution before start(), start() is idempotent',
    async () => {
      const engine = new InterceptorEngine();
      assert.strictEqual(engine.ready, false);

      await assert.rejects(
        async () => engine.execute({ task: '1' }, async (input) => input),
        (err: Error) => err instanceof InterceptorStateError,
      );

      await engine.start();
      assert.strictEqual(engine.ready, true);

      // Idempotent start()
      await engine.start();
      assert.strictEqual(engine.ready, true);

      const result = await engine.execute({ task: '1' }, async (input) => ({
        ...input,
        done: true,
      }));
      assert.strictEqual(result.intercepted, false);
      assert.deepStrictEqual(result.value, { task: '1', done: true });

      await engine.stop();
    },
  );

  await t.test(
    '2. Lifecycle: Rejection of new executions during STOPPING and after STOPPED, idempotent stop()',
    async () => {
      const engine = new InterceptorEngine({ autoStart: true });
      assert.strictEqual(engine.ready, true);

      await engine.stop();
      assert.strictEqual(engine.ready, false);

      await assert.rejects(
        async () => engine.execute({ task: 'post_stop' }, async (input) => input),
        (err: Error) => err instanceof InterceptorStateError,
      );

      // Idempotent stop()
      await engine.stop();
    },
  );

  await t.test(
    '3. Registration: Registration before startup works, rejected after READY',
    async () => {
      const engine = new InterceptorEngine();

      const interceptor: Interceptor<string, string> = {
        async intercept(_input, _context, next) {
          return next();
        },
      };

      engine.use(interceptor);
      await engine.start();

      assert.throws(
        () => engine.use(interceptor),
        (err: Error) => err instanceof InterceptorRegistrationError,
      );

      await engine.stop();
    },
  );

  await t.test(
    '4. Deterministic Ordering: Priority ordering (priority DESC, sequence ASC)',
    async () => {
      const trace: string[] = [];
      const engine = new InterceptorEngine();

      const lowPriority: Interceptor<string, string> = {
        async intercept(_input, _context, next) {
          trace.push('low_before');
          const res = await next();
          trace.push('low_after');
          return res;
        },
      };

      const highPriority: Interceptor<string, string> = {
        async intercept(_input, _context, next) {
          trace.push('high_before');
          const res = await next();
          trace.push('high_after');
          return res;
        },
      };

      const defaultPriority1: Interceptor<string, string> = {
        async intercept(_input, _context, next) {
          trace.push('default1_before');
          const res = await next();
          trace.push('default1_after');
          return res;
        },
      };

      const defaultPriority2: Interceptor<string, string> = {
        async intercept(_input, _context, next) {
          trace.push('default2_before');
          const res = await next();
          trace.push('default2_after');
          return res;
        },
      };

      engine.use(lowPriority, { priority: -10 });
      engine.use(highPriority, { priority: 100 });
      engine.use(defaultPriority1, { priority: 0 });
      engine.use(defaultPriority2, { priority: 0 });
      await engine.start();

      const result = await engine.execute('payload', async (input) => {
        trace.push('handler');
        return `processed_${input}`;
      });

      assert.strictEqual(result.value, 'processed_payload');
      assert.deepStrictEqual(trace, [
        'high_before',
        'default1_before',
        'default2_before',
        'low_before',
        'handler',
        'low_after',
        'default2_after',
        'default1_after',
        'high_after',
      ]);

      await engine.stop();
    },
  );

  await t.test(
    '5. Continuation Guard: Detecting multiple next() invocations and throwing InterceptorContinuationError',
    async () => {
      const engine = new InterceptorEngine();

      const buggyInterceptor: Interceptor<string, string> = {
        async intercept(_input, _context, next) {
          await next();
          return next(); // Illegal second continuation
        },
      };

      engine.use(buggyInterceptor);
      await engine.start();

      await assert.rejects(
        async () => engine.execute('test', async () => 'ok'),
        (err: Error) => err instanceof InterceptorContinuationError,
      );

      await engine.stop();
    },
  );

  await t.test(
    '6. Short-Circuit Execution: Interceptor returns result directly, handler is skipped',
    async () => {
      const engine = new InterceptorEngine();
      let handlerCalled = false;

      const shortCircuitInterceptor: Interceptor<string, { cached: boolean; data: string }> = {
        async intercept() {
          return { cached: true, data: 'fast_path' };
        },
      };

      engine.use(shortCircuitInterceptor);
      await engine.start();

      const result = await engine.execute('query', async () => {
        handlerCalled = true;
        return { cached: false, data: 'slow_path' };
      });

      assert.strictEqual(result.intercepted, true);
      assert.strictEqual(handlerCalled, false);
      assert.deepStrictEqual(result.value, { cached: true, data: 'fast_path' });

      const diag = engine.getDiagnostics();
      assert.strictEqual(diag.shortCircuitedExecutions, 1);
      assert.strictEqual(diag.handlerExecutions, 0);

      await engine.stop();
    },
  );

  await t.test('7. Result Transformation & Exactly-Once Handler Execution', async () => {
    const engine = new InterceptorEngine();
    let handlerCalls = 0;

    const transformInterceptor: Interceptor<number, number> = {
      async intercept(_input, _context, next) {
        const res = await next();
        return res * 10;
      },
    };

    engine.use(transformInterceptor);
    await engine.start();

    const result = await engine.execute(5, async (val) => {
      handlerCalls++;
      return val + 3;
    });

    assert.strictEqual(handlerCalls, 1);
    assert.strictEqual(result.value, 80); // (5 + 3) * 10

    await engine.stop();
  });

  await t.test(
    '8. Error Propagation & Recovery: Downstream errors can be caught and recovered',
    async () => {
      const engine = new InterceptorEngine();

      const recoveryInterceptor: Interceptor<string, string> = {
        async intercept(_input, _context, next) {
          try {
            return await next();
          } catch {
            return 'fallback_value';
          }
        },
      };

      engine.use(recoveryInterceptor);
      await engine.start();

      const result = await engine.execute('fail', async () => {
        throw new Error('Handler crashed');
      });

      assert.strictEqual(result.value, 'fallback_value');

      await engine.stop();
    },
  );

  await t.test(
    '9. Execution Context Propagation: current() lookup via AsyncLocalStorage',
    async () => {
      const contextManager = new ExecutionContextManager();
      const engine = new InterceptorEngine({ contextManager, autoStart: true });

      let observedExecutionId: string | undefined;

      const result = await engine.execute('test', async (_input, context) => {
        observedExecutionId = contextManager.current()?.executionId;
        assert.strictEqual(observedExecutionId, context.executionId);
        return 'ok';
      });

      assert.strictEqual(result.executionId, observedExecutionId);
      assert.strictEqual(contextManager.current(), undefined);

      await engine.stop();
      await contextManager.stop();
    },
  );

  await t.test(
    '10. Cancellation Handling: Aborted context prevents execution and throws error',
    async () => {
      const contextManager = new ExecutionContextManager();
      const engine = new InterceptorEngine({ contextManager, autoStart: true });

      const preCancelledContext = contextManager.create();
      preCancelledContext.cancel();

      let handlerCalled = false;
      await assert.rejects(
        async () =>
          engine.execute(
            'data',
            async () => {
              handlerCalled = true;
              return 'done';
            },
            { context: preCancelledContext },
          ),
        (err: Error) => err.message.includes('cancelled'),
      );

      assert.strictEqual(handlerCalled, false);

      await engine.stop();
      await contextManager.stop();
    },
  );

  await t.test('11. Result Immutability: Deep freeze protection on returned value', async () => {
    const engine = new InterceptorEngine({ autoStart: true });

    const sourceObj = { details: { status: 'INITIAL' } };
    const result = await engine.execute(sourceObj, async (input) => input);

    assert.throws(() => {
      (result.value as { details: { status: string } }).details.status = 'MUTATED';
    });

    await engine.stop();
  });

  await t.test(
    '12. 1,000 Concurrent Executions: High-concurrency isolation and accurate counters',
    async () => {
      const engine = new InterceptorEngine({ autoStart: true });

      const promises: Promise<void>[] = [];
      for (let i = 0; i < 1000; i++) {
        promises.push(
          engine
            .execute(i, async (val) => val * 3)
            .then((res) => {
              assert.strictEqual(res.value, i * 3);
            }),
        );
      }

      await Promise.all(promises);

      const diag = engine.getDiagnostics();
      assert.strictEqual(diag.totalExecutions, 1000);
      assert.strictEqual(diag.completedExecutions, 1000);
      assert.strictEqual(diag.handlerExecutions, 1000);
      assert.strictEqual(diag.activeExecutions, 0);

      await engine.stop();
    },
  );

  await t.test(
    '13. Diagnostics Tracking & Security: Zero payloads, credentials, or execution IDs retained',
    async () => {
      const engine = new InterceptorEngine({ autoStart: true });

      const result = await engine.execute(
        { secretApiKey: 'very_secret_token' },
        async (input) => input,
      );

      const diag = engine.getDiagnostics();
      const serialized = JSON.stringify(diag);

      assert.strictEqual(serialized.includes('very_secret_token'), false);
      assert.strictEqual(serialized.includes(result.executionId), false);
      assert.strictEqual(serialized.includes('secretApiKey'), false);

      await engine.stop();
    },
  );

  await t.test('14. InterceptorBuilder Fluent API', async () => {
    const contextManager = new ExecutionContextManager();
    let interceptorRan = false;

    const engine = new InterceptorBuilder()
      .withContextManager(contextManager)
      .withInterceptor({
        async intercept(_input, _context, next) {
          interceptorRan = true;
          return next();
        },
      })
      .withAutoStart(true)
      .build();

    assert.strictEqual(engine.ready, true);

    const result = await engine.execute('builder_payload', async (input) => `echo_${input}`);
    assert.strictEqual(result.value, 'echo_builder_payload');
    assert.strictEqual(interceptorRan, true);

    await engine.stop();
    await contextManager.stop();
  });

  await t.test(
    '15. Critical Architectural Boundary: Zero higher-layer or forbidden framework dependencies',
    async () => {
      const pkgJsonPath = path.resolve(__dirname, '../../package.json');
      const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

      const deps = Object.keys(pkgJson.dependencies || {});
      const forbidden = [
        '@coreforge/transport',
        '@coreforge/routing',
        '@coreforge/runtime',
        '@coreforge/response',
        '@coreforge/jobs',
        '@coreforge/events',
        '@coreforge/cache',
        '@coreforge/locks',
        '@coreforge/rate-limit',
        '@coreforge/resilience',
        '@coreforge/metrics',
        '@coreforge/tracing',
        '@coreforge/logging',
        '@coreforge/config',
      ];

      for (const f of forbidden) {
        assert.strictEqual(
          deps.includes(f),
          false,
          `Forbidden dependency detected in @coreforge/interceptors: ${f}`,
        );
      }
    },
  );
});
