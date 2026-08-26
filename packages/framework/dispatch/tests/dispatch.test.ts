import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { test } from 'node:test';

import { ExecutionContextManager } from '@coreforge/execution-context';

import {
  CommandHandler,
  CommandValidationError,
  Dispatcher,
  DispatcherBuilder,
  DispatchStateError,
  HandlerNotFoundError,
  HandlerRegistrationError,
} from '../src/index';

test('CoreForge Application Command & Handler Dispatch Engine (@coreforge/dispatch)', async (t) => {
  await t.test('1. Lifecycle: Rejects dispatch before start(), start() is idempotent', async () => {
    const dispatcher = new Dispatcher();
    assert.strictEqual(dispatcher.ready, false);

    dispatcher.register('Echo', {
      async execute(payload: string) {
        return `echo:${payload}`;
      },
    });

    await assert.rejects(
      async () => dispatcher.dispatch({ type: 'Echo', payload: 'hello' }),
      (err: Error) => err instanceof DispatchStateError,
    );

    await dispatcher.start();
    assert.strictEqual(dispatcher.ready, true);

    // Idempotent start()
    await dispatcher.start();
    assert.strictEqual(dispatcher.ready, true);

    const result = await dispatcher.dispatch({ type: 'Echo', payload: 'hello' });
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.value, 'echo:hello');
    assert.strictEqual(result.state, 'COMPLETED');

    await dispatcher.stop();
  });

  await t.test(
    '2. Lifecycle: Rejection of new dispatches during STOPPING and after STOPPED, idempotent stop()',
    async () => {
      const dispatcher = new Dispatcher({ autoStart: true });
      assert.strictEqual(dispatcher.ready, true);

      await dispatcher.stop();
      assert.strictEqual(dispatcher.ready, false);

      await assert.rejects(
        async () => dispatcher.dispatch({ type: 'Test', payload: {} }),
        (err: Error) => err instanceof DispatchStateError,
      );

      // Idempotent stop()
      await dispatcher.stop();
    },
  );

  await t.test(
    '3. Registration: Registration before startup works, rejected after READY',
    async () => {
      const dispatcher = new Dispatcher();

      const handler: CommandHandler<string, string> = {
        async execute(payload) {
          return payload;
        },
      };

      dispatcher.register('Test', handler);
      await dispatcher.start();

      assert.throws(
        () => dispatcher.register('Another', handler),
        (err: Error) => err instanceof HandlerRegistrationError,
      );

      await dispatcher.stop();
    },
  );

  await t.test(
    '4. Registration: Duplicate handler registration is rejected with HandlerRegistrationError',
    async () => {
      const dispatcher = new Dispatcher();

      const handler1: CommandHandler = {
        async execute() {
          return 1;
        },
      };
      const handler2: CommandHandler = {
        async execute() {
          return 2;
        },
      };

      dispatcher.register('DuplicateCmd', handler1);

      assert.throws(
        () => dispatcher.register('DuplicateCmd', handler2),
        (err: Error) => err instanceof HandlerRegistrationError,
      );

      const diag = dispatcher.getDiagnostics();
      assert.strictEqual(diag.registrationFailures, 1);
    },
  );

  await t.test(
    '5. Command Validation: Rejects invalid, empty, whitespace-only, and control-character command types',
    async () => {
      const dispatcher = new Dispatcher({ autoStart: true });

      await assert.rejects(
        async () => dispatcher.dispatch(null as unknown as { type: string; payload: unknown }),
        (err: Error) => err instanceof CommandValidationError,
      );

      await assert.rejects(
        async () => dispatcher.dispatch({ type: '', payload: {} }),
        (err: Error) => err instanceof CommandValidationError,
      );

      await assert.rejects(
        async () => dispatcher.dispatch({ type: '   ', payload: {} }),
        (err: Error) => err instanceof CommandValidationError,
      );

      await assert.rejects(
        async () => dispatcher.dispatch({ type: 'Invalid\x00Type', payload: {} }),
        (err: Error) => err instanceof CommandValidationError,
      );

      await dispatcher.stop();
    },
  );

  await t.test(
    '6. Command Snapshotting & Isolation: Producer mutating command payload after dispatch does not affect execution',
    async () => {
      const dispatcher = new Dispatcher();

      let observedPayload: { count: number } | undefined;

      dispatcher.register('MutateTest', {
        async execute(payload: { count: number }) {
          await new Promise((r) => setTimeout(r, 10));
          observedPayload = payload;
          return payload.count;
        },
      });

      await dispatcher.start();

      const mutablePayload = { count: 10 };
      const dispatchPromise = dispatcher.dispatch({
        type: 'MutateTest',
        payload: mutablePayload,
      });

      // Mutate original producer object immediately
      mutablePayload.count = 999;

      const result = await dispatchPromise;
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.value, 10);
      assert.strictEqual(observedPayload?.count, 10);

      await dispatcher.stop();
    },
  );

  await t.test(
    '7. Circular Reference Handling: Replaces circular structures in payload with "[Circular]" without crashing',
    async () => {
      const dispatcher = new Dispatcher();

      let receivedPayload: unknown;

      dispatcher.register('CircularTest', {
        async execute(payload) {
          receivedPayload = payload;
          return 'sanitized';
        },
      });

      await dispatcher.start();

      const circularObj: { name: string; self?: unknown } = { name: 'cycle' };
      circularObj.self = circularObj;

      const result = await dispatcher.dispatch({
        type: 'CircularTest',
        payload: circularObj,
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual((receivedPayload as { self: string }).self, '[Circular]');

      await dispatcher.stop();
    },
  );

  await t.test(
    '8. Handler Resolution & Missing Handler: Throws HandlerNotFoundError and tracks diagnostics',
    async () => {
      const dispatcher = new Dispatcher({ autoStart: true });

      await assert.rejects(
        async () => dispatcher.dispatch({ type: 'NonExistentCmd', payload: {} }),
        (err: Error) => err instanceof HandlerNotFoundError,
      );

      const diag = dispatcher.getDiagnostics();
      assert.strictEqual(diag.handlerNotFound, 1);

      await dispatcher.stop();
    },
  );

  await t.test(
    '9. Successful Dispatch: Returns COMPLETED result with execution metadata',
    async () => {
      const dispatcher = new Dispatcher();

      dispatcher.register('CreateOrder', {
        async execute(payload: { orderId: string; amount: number }) {
          return { status: 'CONFIRMED', id: payload.orderId, total: payload.amount };
        },
      });

      await dispatcher.start();

      const result = await dispatcher.dispatch({
        type: 'CreateOrder',
        payload: { orderId: 'ord-123', amount: 50 },
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.state, 'COMPLETED');
      assert.strictEqual(result.commandType, 'CreateOrder');
      assert.strictEqual(typeof result.executionId, 'string');
      assert.strictEqual(typeof result.durationMs, 'number');
      assert.deepStrictEqual(result.value, {
        status: 'CONFIRMED',
        id: 'ord-123',
        total: 50,
      });

      const diag = dispatcher.getDiagnostics();
      assert.strictEqual(diag.totalDispatches, 1);
      assert.strictEqual(diag.completedDispatches, 1);
      assert.strictEqual(diag.failedDispatches, 0);

      await dispatcher.stop();
    },
  );

  await t.test(
    '10. Handler Failure: Returns FAILED result and increments handlerFailures',
    async () => {
      const dispatcher = new Dispatcher();

      dispatcher.register('FailingCmd', {
        async execute() {
          throw new Error('Database connection failed');
        },
      });

      await dispatcher.start();

      const result = await dispatcher.dispatch({
        type: 'FailingCmd',
        payload: {},
      });

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.state, 'FAILED');
      assert.strictEqual((result.error as Error).message, 'Database connection failed');

      const diag = dispatcher.getDiagnostics();
      assert.strictEqual(diag.failedDispatches, 1);
      assert.strictEqual(diag.handlerFailures, 1);

      await dispatcher.stop();
    },
  );

  await t.test(
    '11. Cancellation Handling: Aborted context results in CANCELLED state and no handler execution',
    async () => {
      const contextManager = new ExecutionContextManager();
      const dispatcher = new Dispatcher({ contextManager });

      let handlerRan = false;

      dispatcher.register('CancellableCmd', {
        async execute() {
          handlerRan = true;
          return 'executed';
        },
      });

      await dispatcher.start();

      const cancelledContext = contextManager.create();
      cancelledContext.cancel();

      const result = await dispatcher.dispatch(
        { type: 'CancellableCmd', payload: {} },
        { context: cancelledContext },
      );

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.state, 'CANCELLED');
      assert.strictEqual(handlerRan, false);

      const diag = dispatcher.getDiagnostics();
      assert.strictEqual(diag.cancelledDispatches, 1);

      await dispatcher.stop();
      await contextManager.stop();
    },
  );

  await t.test(
    '12. Execution Context Propagation: contextManager.current() resolves active context',
    async () => {
      const contextManager = new ExecutionContextManager();
      const dispatcher = new Dispatcher({ contextManager });

      let capturedId: string | undefined;

      dispatcher.register('ContextCmd', {
        async execute(_payload, context) {
          capturedId = contextManager.current()?.executionId;
          assert.strictEqual(capturedId, context.executionId);
          return 'ok';
        },
      });

      await dispatcher.start();

      const result = await dispatcher.dispatch({ type: 'ContextCmd', payload: {} });
      assert.strictEqual(result.executionId, capturedId);
      assert.strictEqual(contextManager.current(), undefined);

      await dispatcher.stop();
      await contextManager.stop();
    },
  );

  await t.test('13. Interceptor & Middleware Pipeline Integration', async () => {
    const dispatcher = new Dispatcher();
    const trace: string[] = [];

    // Register Interceptor
    dispatcher.interceptorEngine.use({
      async intercept(_input, _context, next) {
        trace.push('interceptor_before');
        const res = await next();
        trace.push('interceptor_after');
        return res;
      },
    });

    // Register Execution Middleware
    dispatcher.executionEngine.use({
      async execute(_input, _context, next) {
        trace.push('middleware_before');
        const res = await next();
        trace.push('middleware_after');
        return res;
      },
    });

    dispatcher.register('PipelineCmd', {
      async execute(payload: string) {
        trace.push('handler');
        return `handled:${payload}`;
      },
    });

    await dispatcher.start();

    const result = await dispatcher.dispatch({ type: 'PipelineCmd', payload: 'data' });

    assert.strictEqual(result.value, 'handled:data');
    assert.deepStrictEqual(trace, [
      'interceptor_before',
      'middleware_before',
      'handler',
      'middleware_after',
      'interceptor_after',
    ]);

    await dispatcher.stop();
  });

  await t.test('14. Result Immutability: Deep freeze protection on returned value', async () => {
    const dispatcher = new Dispatcher();

    dispatcher.register('FreezeCmd', {
      async execute() {
        return { nested: { prop: 'value' } };
      },
    });

    await dispatcher.start();

    const result = await dispatcher.dispatch({ type: 'FreezeCmd', payload: {} });

    assert.throws(() => {
      (result.value as { nested: { prop: string } }).nested.prop = 'mutated';
    });

    await dispatcher.stop();
  });

  await t.test(
    '15. 1,000 Concurrent Dispatches: High-concurrency isolation and accurate metrics',
    async () => {
      const dispatcher = new Dispatcher();

      dispatcher.register('AddCmd', {
        async execute(payload: { a: number; b: number }) {
          return payload.a + payload.b;
        },
      });

      await dispatcher.start();

      const promises: Promise<void>[] = [];
      for (let i = 0; i < 1000; i++) {
        promises.push(
          dispatcher.dispatch({ type: 'AddCmd', payload: { a: i, b: i * 2 } }).then((res) => {
            assert.strictEqual(res.success, true);
            assert.strictEqual(res.value, i * 3);
          }),
        );
      }

      await Promise.all(promises);

      const diag = dispatcher.getDiagnostics();
      assert.strictEqual(diag.totalDispatches, 1000);
      assert.strictEqual(diag.completedDispatches, 1000);
      assert.strictEqual(diag.handlerExecutions, 1000);
      assert.strictEqual(diag.activeDispatches, 0);

      await dispatcher.stop();
    },
  );

  await t.test(
    '16. Diagnostics Security: Zero payloads, credentials, error stacks, or execution IDs stored',
    async () => {
      const dispatcher = new Dispatcher();

      dispatcher.register('SecretCmd', {
        async execute(payload: { secretToken: string }) {
          return { ok: true, token: payload.secretToken };
        },
      });

      await dispatcher.start();

      const result = await dispatcher.dispatch({
        type: 'SecretCmd',
        payload: { secretToken: 'top_secret_token_123' },
      });

      const diag = dispatcher.getDiagnostics();
      const serialized = JSON.stringify(diag);

      assert.strictEqual(serialized.includes('top_secret_token_123'), false);
      assert.strictEqual(serialized.includes(result.executionId), false);
      assert.strictEqual(serialized.includes('secretToken'), false);

      await dispatcher.stop();
    },
  );

  await t.test('17. DispatcherBuilder Fluent API', async () => {
    const contextManager = new ExecutionContextManager();

    const dispatcher = new DispatcherBuilder()
      .withContextManager(contextManager)
      .withHandler('BuilderEcho', {
        async execute(payload: string) {
          return `echo_${payload}`;
        },
      })
      .withAutoStart(true)
      .build();

    assert.strictEqual(dispatcher.ready, true);

    const result = await dispatcher.dispatch({ type: 'BuilderEcho', payload: 'test' });
    assert.strictEqual(result.value, 'echo_test');

    await dispatcher.stop();
    await contextManager.stop();
  });

  await t.test(
    '18. Critical Architectural Boundary: Zero higher-layer or forbidden framework dependencies',
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
          `Forbidden dependency detected in @coreforge/dispatch: ${f}`,
        );
      }
    },
  );
});
