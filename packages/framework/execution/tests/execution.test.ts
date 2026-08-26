import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { test } from 'node:test';

import { ExecutionContextManager } from '@coreforge/execution-context';

import {
  ExecutionCancellationError,
  ExecutionEngine,
  ExecutionEngineBuilder,
  ExecutionEngineStateError,
  ExecutionMiddleware,
  ExecutionMiddlewareRegistrationError,
} from '../src/index';

test('CoreForge Application Execution Pipeline Engine (@coreforge/execution)', async (t) => {
  await t.test(
    '1. Lifecycle: Cannot execute before start(), start() is idempotent, works after READY',
    async () => {
      const engine = new ExecutionEngine();
      assert.strictEqual(engine.ready, false);

      await assert.rejects(
        async () => engine.execute({ task: '1' }, async (input) => input),
        (err: Error) => err instanceof ExecutionEngineStateError,
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
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.state, 'COMPLETED');
      assert.deepStrictEqual(result.value, { task: '1', done: true });

      await engine.stop();
    },
  );

  await t.test(
    '2. Lifecycle: Rejection of new executions during STOPPING and after STOPPED',
    async () => {
      const engine = new ExecutionEngine({ autoStart: true });
      assert.strictEqual(engine.ready, true);

      await engine.stop();
      assert.strictEqual(engine.ready, false);

      await assert.rejects(
        async () => engine.execute({ task: 'post_stop' }, async (input) => input),
        (err: Error) => err instanceof ExecutionEngineStateError,
      );

      // Idempotent stop()
      await engine.stop();
    },
  );

  await t.test(
    '3. Deterministic Middleware Ordering & Unwinding (Outer->Inner before, Inner->Outer after)',
    async () => {
      const trace: string[] = [];
      const engine = new ExecutionEngine();

      const mw1: ExecutionMiddleware<string, string> = {
        async execute(_input, _context, next) {
          trace.push('mw1_before');
          const res = await next();
          trace.push('mw1_after');
          return res;
        },
      };

      const mw2: ExecutionMiddleware<string, string> = {
        async execute(_input, _context, next) {
          trace.push('mw2_before');
          const res = await next();
          trace.push('mw2_after');
          return res;
        },
      };

      engine.use(mw1);
      engine.use(mw2);
      await engine.start();

      const result = await engine.execute<string, string>('payload', async (input) => {
        trace.push('handler');
        return `processed_${input}`;
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.value, 'processed_payload');
      assert.deepStrictEqual(trace, [
        'mw1_before',
        'mw2_before',
        'handler',
        'mw2_after',
        'mw1_after',
      ]);

      await engine.stop();
    },
  );

  await t.test(
    '4. Middleware Transformation & Error Handling: Transform results and catch errors',
    async () => {
      const engine = new ExecutionEngine();

      const transformMw: ExecutionMiddleware<number, number> = {
        async execute(_input, _context, next) {
          const res = await next();
          return res * 2;
        },
      };

      const catchMw: ExecutionMiddleware<number, number> = {
        async execute(_input, _context, next) {
          try {
            return await next();
          } catch {
            return 999;
          }
        },
      };

      engine.use(transformMw);
      engine.use(catchMw);
      await engine.start();

      const result = await engine.execute<number, number>(10, async () => {
        throw new Error('Downstream failure');
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.value, 1998); // catchMw caught and returned 999, transformMw multiplied by 2 = 1998

      await engine.stop();
    },
  );

  await t.test(
    '5. Middleware Registration Immutability: Cannot register middleware after READY',
    async () => {
      const engine = new ExecutionEngine();
      await engine.start();

      const lateMw: ExecutionMiddleware = {
        async execute(_input, _context, next) {
          return next();
        },
      };

      assert.throws(
        () => engine.use(lateMw),
        (err: Error) => err instanceof ExecutionMiddlewareRegistrationError,
      );

      await engine.stop();
    },
  );

  await t.test('6. Exactly-Once Handler Execution & Result Preservation', async () => {
    const engine = new ExecutionEngine({ autoStart: true });
    let handlerInvocations = 0;

    const result = await engine.execute<{ count: number }, { count: number; ok: boolean }>(
      { count: 1 },
      async (input) => {
        handlerInvocations++;
        return { ...input, ok: true };
      },
    );

    assert.strictEqual(result.success, true);
    assert.strictEqual(handlerInvocations, 1);
    assert.deepStrictEqual(result.value, { count: 1, ok: true });

    await engine.stop();
  });

  await t.test('7. Handler Failure: Converts thrown error to FAILED result state', async () => {
    const engine = new ExecutionEngine({ autoStart: true });

    const result = await engine.execute<string, string>('test', async () => {
      throw new Error('Database connection failed');
    });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.state, 'FAILED');
    assert.strictEqual((result.error as Error).message, 'Database connection failed');

    await engine.stop();
  });

  await t.test(
    '8. Short-Circuit Semantics: Middleware terminates early without calling handler',
    async () => {
      const engine = new ExecutionEngine();
      let handlerCalled = false;

      const shortCircuitMw: ExecutionMiddleware<string, { cached: boolean; data: string }> = {
        async execute(_input, _context, _next) {
          return { cached: true, data: 'instant_response' };
        },
      };

      engine.use(shortCircuitMw);
      await engine.start();

      const result = await engine.execute<string, { cached: boolean; data: string }>(
        'query',
        async () => {
          handlerCalled = true;
          return { cached: false, data: 'live' };
        },
      );

      assert.strictEqual(result.success, true);
      assert.strictEqual(handlerCalled, false);
      assert.deepStrictEqual(result.value, { cached: true, data: 'instant_response' });

      const diag = engine.getDiagnostics();
      assert.strictEqual(diag.shortCircuitedExecutions, 1);
      assert.strictEqual(diag.handlerExecutions, 0);

      await engine.stop();
    },
  );

  await t.test(
    '9. Cancellation Semantics: Pre-cancelled and runtime cancellation produces CANCELLED state',
    async () => {
      const contextManager = new ExecutionContextManager();
      const engine = new ExecutionEngine({ contextManager, autoStart: true });

      // 1. Pre-cancelled context
      const preCancelledContext = contextManager.create();
      preCancelledContext.cancel();

      let handlerExecuted = false;
      const preRes = await engine.execute<string, void>(
        'data',
        async () => {
          handlerExecuted = true;
        },
        { context: preCancelledContext },
      );

      assert.strictEqual(preRes.success, false);
      assert.strictEqual(preRes.state, 'CANCELLED');
      assert.strictEqual(handlerExecuted, false);

      // 2. Runtime cancellation during execution
      const activeContext = contextManager.create();
      const runRes = await engine.execute<string, string>(
        'data',
        async (_input, ctx) => {
          ctx.cancel();
          throw new ExecutionCancellationError('Operation was cancelled during processing');
        },
        { context: activeContext },
      );

      assert.strictEqual(runRes.success, false);
      assert.strictEqual(runRes.state, 'CANCELLED');

      await engine.stop();
      await contextManager.stop();
    },
  );

  await t.test(
    '10. Context Scoping: Automatic context creation and AsyncLocalStorage current() lookup',
    async () => {
      const contextManager = new ExecutionContextManager();
      const engine = new ExecutionEngine({ contextManager, autoStart: true });

      let detectedExecutionId: string | undefined;

      const result = await engine.execute<string, string>('ping', async (_input, context) => {
        detectedExecutionId = contextManager.current()?.executionId;
        assert.strictEqual(detectedExecutionId, context.executionId);
        return 'pong';
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.executionId, detectedExecutionId);
      assert.strictEqual(contextManager.current(), undefined);

      await engine.stop();
      await contextManager.stop();
    },
  );

  await t.test('11. Result Immutability & Deep Isolation', async () => {
    const engine = new ExecutionEngine({ autoStart: true });

    const sourceObj = { nested: { count: 10 } };
    const result = await engine.execute<
      { nested: { count: number } },
      { nested: { count: number } }
    >(sourceObj, async (input) => {
      return input;
    });

    assert.strictEqual(result.success, true);
    assert.throws(() => {
      (result.value as { nested: { count: number } }).nested.count = 999;
    });

    await engine.stop();
  });

  await t.test(
    '12. 1,000 Concurrent Executions: High-concurrency isolation and accurate diagnostics',
    async () => {
      const engine = new ExecutionEngine({ autoStart: true });

      const promises: Promise<void>[] = [];
      for (let i = 0; i < 1000; i++) {
        promises.push(
          engine
            .execute<number, number>(i, async (val) => val * 2)
            .then((res) => {
              assert.strictEqual(res.success, true);
              assert.strictEqual(res.value, i * 2);
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
      const engine = new ExecutionEngine({ autoStart: true });

      const result = await engine.execute<
        { secretKey: string },
        { secretKey: string; processed: boolean }
      >({ secretKey: 'top_secret_val' }, async (input) => {
        return { ...input, processed: true };
      });

      const diag = engine.getDiagnostics();
      const serialized = JSON.stringify(diag);

      assert.strictEqual(serialized.includes('top_secret_val'), false);
      assert.strictEqual(serialized.includes(result.executionId), false);
      assert.strictEqual(serialized.includes('secretKey'), false);

      await engine.stop();
    },
  );

  await t.test('14. ExecutionEngineBuilder Fluent API', async () => {
    const contextManager = new ExecutionContextManager();
    let mwExecuted = false;

    const engine = new ExecutionEngineBuilder()
      .withContextManager(contextManager)
      .withMiddleware<string, string>({
        async execute(_input, _context, next) {
          mwExecuted = true;
          return next();
        },
      })
      .withAutoStart(true)
      .build();

    assert.strictEqual(engine.ready, true);

    const result = await engine.execute<string, string>(
      'builder_test',
      async (input) => `ok_${input}`,
    );
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.value, 'ok_builder_test');
    assert.strictEqual(mwExecuted, true);

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
        '@coreforge/response',
        '@coreforge/runtime',
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
          `Forbidden dependency detected in @coreforge/execution: ${f}`,
        );
      }
    },
  );
});
