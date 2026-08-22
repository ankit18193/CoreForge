import * as assert from 'node:assert';
import { test } from 'node:test';

import { ContainerBuilder, OnDestroy, OnInit } from '@coreforge/di';

import {
  ContextCancelledError,
  ContextDisposedError,
  ContextNotFoundError,
  ContextTimeoutError,
  RequestContextBuilder,
  RequestContextManager,
  RequestContextManagerBuilder,
} from '../index';

test('CoreForge Request Context & Scope Engine Package (@coreforge/request-context)', async (t) => {
  await t.test(
    '1. Context creation with unique ID, correlation ID, trace ID, and start timestamp',
    async () => {
      const diContainer = new ContainerBuilder().build();
      diContainer.makeReady();

      const manager = new RequestContextManager(diContainer);

      const ctx = await manager.createContext({
        id: 'custom-req-123',
        correlationId: 'corr-xyz-999',
        traceId: 'trace-abc-111',
        attributes: { clientIp: '127.0.0.1' },
      });

      assert.strictEqual(ctx.id, 'custom-req-123');
      assert.strictEqual(ctx.correlationId, 'corr-xyz-999');
      assert.strictEqual(ctx.traceId, 'trace-abc-111');
      assert.ok(ctx.startTime > 0);
      assert.strictEqual(ctx.get('clientIp'), '127.0.0.1');
      assert.strictEqual(ctx.isDisposed, false);

      await ctx.dispose();
      await diContainer.stop();
    },
  );

  await t.test(
    '2. Context attribute management (get, set, has, delete) with per-context isolation',
    async () => {
      const diContainer = new ContainerBuilder().build();
      diContainer.makeReady();

      const manager = new RequestContextManager(diContainer);

      const ctx1 = await manager.createContext();
      const ctx2 = await manager.createContext();

      ctx1.set('user', { id: 'u1' });
      ctx2.set('user', { id: 'u2' });

      assert.deepStrictEqual(ctx1.get('user'), { id: 'u1' });
      assert.deepStrictEqual(ctx2.get('user'), { id: 'u2' });

      assert.strictEqual(ctx1.has('user'), true);
      assert.strictEqual(ctx1.has('missing'), false);

      ctx1.delete('user');
      assert.strictEqual(ctx1.has('user'), false);
      assert.strictEqual(ctx2.has('user'), true);

      await ctx1.dispose();
      await ctx2.dispose();
      await diContainer.stop();
    },
  );

  await t.test('3. DI resolution delegation through public RequestScope contract', async () => {
    let initCount = 0;

    class RequestScopedService implements OnInit {
      public readonly createdAt = Date.now();
      public onInit(): void {
        initCount++;
      }
    }

    const diContainer = new ContainerBuilder()
      .registerClass(RequestScopedService, RequestScopedService, 'REQUEST')
      .build();

    diContainer.makeReady();

    const manager = new RequestContextManager(diContainer);

    const ctx = await manager.createContext();

    const s1 = await ctx.resolve(RequestScopedService);
    const s2 = await ctx.resolve(RequestScopedService);

    assert.strictEqual(s1, s2, 'Same context must resolve same scoped instance');
    assert.strictEqual(initCount, 1, 'onInit executed via DI exactly once');

    await ctx.dispose();
    await diContainer.stop();
  });

  await t.test(
    '4. Automatic scope disposal and execution of onDestroy() upon request completion in runInContext',
    async () => {
      let destroyCount = 0;

      class OrderProcessor implements OnDestroy {
        public processOrder(): string {
          return 'ORDER_PROCESSED';
        }

        public onDestroy(): void {
          destroyCount++;
        }
      }

      const diContainer = new ContainerBuilder()
        .registerClass(OrderProcessor, OrderProcessor, 'REQUEST')
        .build();

      diContainer.makeReady();

      const manager = new RequestContextManager(diContainer);

      const result = await manager.runInContext(async (ctx) => {
        const processor = await ctx.resolve(OrderProcessor);
        return processor.processOrder();
      });

      assert.strictEqual(result, 'ORDER_PROCESSED');
      assert.strictEqual(destroyCount, 1, 'onDestroy must run automatically on scope disposal');

      await diContainer.stop();
    },
  );

  await t.test(
    '5. Idempotent RequestContext.dispose() sharing single disposal promise',
    async () => {
      let destroyCount = 0;

      class CleanupTarget implements OnDestroy {
        public onDestroy(): void {
          destroyCount++;
        }
      }

      const diContainer = new ContainerBuilder()
        .registerClass(CleanupTarget, CleanupTarget, 'REQUEST')
        .build();

      diContainer.makeReady();

      const manager = new RequestContextManager(diContainer);
      const ctx = await manager.createContext();

      await ctx.resolve(CleanupTarget);

      // Concurrent disposal calls
      const [d1, d2, d3] = [ctx.dispose(), ctx.dispose(), ctx.dispose()];
      await Promise.all([d1, d2, d3]);

      assert.strictEqual(
        destroyCount,
        1,
        'onDestroy must execute only once despite multiple dispose() calls',
      );
      assert.strictEqual(ctx.isDisposed, true);

      await diContainer.stop();
    },
  );

  await t.test(
    '6. Instance-owned AsyncLocalStorage propagation across deep asynchronous call chains',
    async () => {
      const diContainer = new ContainerBuilder().build();
      diContainer.makeReady();

      const manager = new RequestContextManagerBuilder().setScopeFactory(diContainer).build();

      async function asyncStepC(): Promise<string> {
        await new Promise((resolve) => setTimeout(resolve, 5));
        const current = manager.getCurrentContext();
        assert.ok(current);
        return current.get<string>('authRole') || 'NONE';
      }

      async function asyncStepB(): Promise<string> {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return asyncStepC();
      }

      async function asyncStepA(): Promise<string> {
        return asyncStepB();
      }

      const role = await manager.runInContext(
        { attributes: { authRole: 'ADMIN_SUPERUSER' } },
        async () => {
          return asyncStepA();
        },
      );

      assert.strictEqual(role, 'ADMIN_SUPERUSER');
      await diContainer.stop();
    },
  );

  await t.test('7. Accessing context outside async boundary throws ContextNotFoundError', () => {
    const diContainer = new ContainerBuilder().build();
    diContainer.makeReady();

    const manager = new RequestContextManager(diContainer);

    assert.strictEqual(manager.getCurrentContext(), undefined);
    assert.throws(() => {
      manager.storage.getCurrent();
    }, ContextNotFoundError);
  });

  await t.test('8. Accessing disposed context throws ContextDisposedError', async () => {
    const diContainer = new ContainerBuilder().build();
    diContainer.makeReady();

    const manager = new RequestContextManager(diContainer);
    const ctx = await manager.createContext();

    await ctx.dispose();

    assert.throws(() => {
      ctx.get('any');
    }, ContextDisposedError);

    assert.throws(() => {
      ctx.set('key', 'val');
    }, ContextDisposedError);

    await assert.rejects(async () => {
      await ctx.resolve('ANY_TOKEN');
    }, ContextDisposedError);

    await diContainer.stop();
  });

  await t.test(
    '9. Execution timeout triggers AbortSignal and throws ContextTimeoutError',
    async () => {
      const diContainer = new ContainerBuilder().build();
      diContainer.makeReady();

      const manager = new RequestContextManager(diContainer);

      await assert.rejects(
        async () => {
          await manager.runInContext({ timeoutMs: 20 }, async (ctx) => {
            await new Promise((resolve) => setTimeout(resolve, 50));
            ctx.throwIfAborted();
            return 'SHOULD_NOT_REACH';
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof ContextTimeoutError);
          assert.strictEqual(err.timeoutMs, 20);
          return true;
        },
      );

      await diContainer.stop();
    },
  );

  await t.test(
    '10. External AbortSignal propagation causes cancellation and does NOT throw ContextTimeoutError',
    async () => {
      const diContainer = new ContainerBuilder().build();
      diContainer.makeReady();

      const manager = new RequestContextManager(diContainer);
      const externalController = new AbortController();

      const runPromise = manager.runInContext(
        { signal: externalController.signal },
        async (ctx) => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          ctx.throwIfAborted();
          return 'DONE';
        },
      );

      // Abort externally after 10ms
      setTimeout(() => {
        externalController.abort('Client connection closed');
      }, 10);

      await assert.rejects(runPromise, (err: unknown) => {
        assert.ok(err instanceof ContextCancelledError);
        assert.ok(!(err instanceof ContextTimeoutError), 'Must NOT be ContextTimeoutError');
        return true;
      });

      await diContainer.stop();
    },
  );

  await t.test(
    '11. 1,000 concurrent requests maintain absolute isolation with no cross-request leakage',
    async () => {
      let instanceCounter = 0;

      class RequestState {
        public readonly id = ++instanceCounter;
      }

      const diContainer = new ContainerBuilder()
        .registerClass(RequestState, RequestState, 'REQUEST')
        .build();

      diContainer.makeReady();

      const manager = new RequestContextManager(diContainer);

      const tasks = Array.from({ length: 1000 }, (_, i) => {
        return manager.runInContext(
          { id: `req-batch-${i}`, attributes: { index: i } },
          async (ctx) => {
            const state = await ctx.resolve(RequestState);
            assert.strictEqual(ctx.get('index'), i);
            return { index: i, stateId: state.id };
          },
        );
      });

      const results = await Promise.all(tasks);
      const stateIds = new Set(results.map((r) => r.stateId));

      assert.strictEqual(results.length, 1000);
      assert.strictEqual(
        stateIds.size,
        1000,
        '1000 concurrent requests must produce 1000 unique scoped state instances',
      );
      assert.strictEqual(
        manager.activeContextCount,
        0,
        'All contexts must be disposed after execution',
      );

      await diContainer.stop();
    },
  );

  await t.test(
    '12. Diagnostics snapshots track active, completed, timed out, and duration metrics',
    async () => {
      const diContainer = new ContainerBuilder().build();
      diContainer.makeReady();

      const manager = new RequestContextManagerBuilder()
        .setScopeFactory(diContainer)
        .setEnableDiagnostics(true)
        .build();

      await manager.runInContext(async () => 'ok1');
      await manager.runInContext(async () => 'ok2');

      try {
        await manager.runInContext({ timeoutMs: 10 }, async (ctx) => {
          await new Promise((resolve) => setTimeout(resolve, 30));
          ctx.throwIfAborted();
        });
      } catch {
        // Expected timeout
      }

      const diag = manager.diagnostics;

      assert.strictEqual(diag.totalCreated, 3);
      assert.strictEqual(diag.totalCompleted, 2);
      assert.strictEqual(diag.totalTimedOut, 1);
      assert.strictEqual(diag.activeContextCount, 0);
      assert.ok(diag.averageDurationMs >= 0);
      assert.ok(Object.isFrozen(diag));

      await diContainer.stop();
    },
  );

  await t.test('13. RequestContextBuilder builds fully configured RequestContext', async () => {
    const diContainer = new ContainerBuilder().build();
    diContainer.makeReady();

    const scope = diContainer.createScope();

    const ctx = new RequestContextBuilder()
      .setId('builder-id-1')
      .setCorrelationId('builder-corr-1')
      .setTraceId('trace-1')
      .setTimeoutMs(5000)
      .setAttribute('role', 'GUEST')
      .build(scope);

    assert.strictEqual(ctx.id, 'builder-id-1');
    assert.strictEqual(ctx.correlationId, 'builder-corr-1');
    assert.strictEqual(ctx.traceId, 'trace-1');
    assert.strictEqual(ctx.get('role'), 'GUEST');

    await ctx.dispose();
    await diContainer.stop();
  });
});
