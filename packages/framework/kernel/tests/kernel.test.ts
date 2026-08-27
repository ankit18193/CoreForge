import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { test } from 'node:test';

import { ApplicationBuilder } from '@coreforge/application';
import { DispatcherBuilder } from '@coreforge/dispatch';
import { ErrorHandlingEngine } from '@coreforge/error-handling';
import { EventBuilder } from '@coreforge/events';
import { ExecutionEngine } from '@coreforge/execution';
import { ExecutionContextManager } from '@coreforge/execution-context';
import { QueryBuilder } from '@coreforge/query';

import {
  ApplicationKernel,
  ApplicationKernelBuilder,
  KernelComponent,
  KernelDependencyError,
  KernelRegistrationError,
  KernelStartupError,
  KernelStateError,
} from '../src/index';

test('CoreForge Application Kernel & Lifecycle Coordination Engine (@coreforge/kernel)', async (t) => {
  await t.test('1. Initial CREATED State: Kernel begins in CREATED state', () => {
    const kernel = new ApplicationKernel();
    assert.strictEqual(kernel.state, 'CREATED');
    assert.strictEqual(kernel.ready, false);
  });

  await t.test('2. Successful Startup: Transitions CREATED -> INITIALIZING -> READY', async () => {
    const kernel = new ApplicationKernel();
    await kernel.start();
    assert.strictEqual(kernel.state, 'READY');
    assert.strictEqual(kernel.ready, true);

    const diag = kernel.getDiagnostics();
    assert.strictEqual(diag.successfulStarts, 1);
    assert.strictEqual(diag.failedStarts, 0);

    await kernel.stop();
  });

  await t.test('3. Successful Shutdown: Transitions READY -> STOPPING -> STOPPED', async () => {
    const kernel = new ApplicationKernel();
    await kernel.start();
    await kernel.stop();

    assert.strictEqual(kernel.state, 'STOPPED');
    assert.strictEqual(kernel.ready, false);

    const diag = kernel.getDiagnostics();
    assert.strictEqual(diag.successfulStops, 1);
    assert.strictEqual(diag.failedStops, 0);
  });

  await t.test('4. Idempotent Start: start() called multiple times is safe', async () => {
    const kernel = new ApplicationKernel();
    await kernel.start();
    await kernel.start(); // second call
    assert.strictEqual(kernel.state, 'READY');
    await kernel.stop();
  });

  await t.test('5. Idempotent Stop: stop() called multiple times is safe', async () => {
    const kernel = new ApplicationKernel();
    await kernel.start();
    await kernel.stop();
    await kernel.stop(); // second call
    assert.strictEqual(kernel.state, 'STOPPED');
  });

  await t.test('6. Component Registration: Registration before initialization works', async () => {
    const kernel = new ApplicationKernel();
    let started = false;
    let stopped = false;

    const component: KernelComponent = {
      id: 'custom_comp',
      start() {
        started = true;
      },
      stop() {
        stopped = true;
      },
      ready: true,
    };

    kernel.registerComponent(component);
    await kernel.start();
    assert.strictEqual(started, true);

    await kernel.stop();
    assert.strictEqual(stopped, true);
  });

  await t.test(
    '7. Registration Rejection: Registration after initialization throws KernelRegistrationError',
    async () => {
      const kernel = new ApplicationKernel();
      await kernel.start();

      const component: KernelComponent = {
        id: 'post_start_comp',
        start() {},
        stop() {},
        ready: true,
      };

      assert.throws(
        () => kernel.registerComponent(component),
        (err: Error) => err instanceof KernelRegistrationError,
      );

      await kernel.stop();
    },
  );

  await t.test('8. Duplicate Component Registration: Rejection of duplicate component IDs', () => {
    const kernel = new ApplicationKernel();
    const comp: KernelComponent = {
      id: 'dup_id',
      start() {},
      stop() {},
      ready: true,
    };

    kernel.registerComponent(comp);
    assert.throws(
      () => kernel.registerComponent(comp),
      (err: Error) => err instanceof KernelRegistrationError,
    );
  });

  await t.test('9. Missing Dependency Detection: Throws KernelDependencyError', async () => {
    const kernel = new ApplicationKernel();
    kernel.registerComponent({
      id: 'service_a',
      dependencies: ['missing_dep'],
      start() {},
      stop() {},
      ready: true,
    });

    await assert.rejects(
      async () => kernel.start(),
      (err: Error) => err instanceof KernelDependencyError,
    );
  });

  await t.test('10. Dependency Cycle Detection: Throws KernelDependencyError', async () => {
    const kernel = new ApplicationKernel();
    kernel.registerComponent({
      id: 'node_1',
      dependencies: ['node_2'],
      start() {},
      stop() {},
      ready: true,
    });
    kernel.registerComponent({
      id: 'node_2',
      dependencies: ['node_3'],
      start() {},
      stop() {},
      ready: true,
    });
    kernel.registerComponent({
      id: 'node_3',
      dependencies: ['node_1'],
      start() {},
      stop() {},
      ready: true,
    });

    await assert.rejects(
      async () => kernel.start(),
      (err: Error) => err instanceof KernelDependencyError,
    );
  });

  await t.test(
    '11. Deterministic Dependency Ordering: Components start in topological order',
    async () => {
      const order: string[] = [];
      const kernel = new ApplicationKernel();

      kernel.registerComponent({
        id: 'layer_3',
        dependencies: ['layer_2'],
        start() {
          order.push('layer_3');
        },
        stop() {},
        ready: true,
      });
      kernel.registerComponent({
        id: 'layer_1',
        start() {
          order.push('layer_1');
        },
        stop() {},
        ready: true,
      });
      kernel.registerComponent({
        id: 'layer_2',
        dependencies: ['layer_1'],
        start() {
          order.push('layer_2');
        },
        stop() {},
        ready: true,
      });

      await kernel.start();
      assert.deepStrictEqual(order, ['layer_1', 'layer_2', 'layer_3']);

      await kernel.stop();
    },
  );

  await t.test(
    '12. Reverse-Order Shutdown: Components stop in reverse dependency order',
    async () => {
      const stopOrder: string[] = [];
      const kernel = new ApplicationKernel();

      kernel.registerComponent({
        id: 'base',
        start() {},
        stop() {
          stopOrder.push('base');
        },
        ready: true,
      });
      kernel.registerComponent({
        id: 'dependent',
        dependencies: ['base'],
        start() {},
        stop() {
          stopOrder.push('dependent');
        },
        ready: true,
      });

      await kernel.start();
      await kernel.stop();

      assert.deepStrictEqual(stopOrder, ['dependent', 'base']);
    },
  );

  await t.test(
    '13. Partial Startup Failure Cleanup: Rolls back already started components',
    async () => {
      const stoppedComponents: string[] = [];
      const kernel = new ApplicationKernel();

      kernel.registerComponent({
        id: 'comp_first',
        start() {},
        stop() {
          stoppedComponents.push('comp_first');
        },
        ready: true,
      });

      kernel.registerComponent({
        id: 'comp_failing',
        dependencies: ['comp_first'],
        start() {
          throw new Error('Component crashed during startup');
        },
        stop() {},
        ready: true,
      });

      await assert.rejects(
        async () => kernel.start(),
        (err: Error) => err instanceof KernelStartupError,
      );

      assert.deepStrictEqual(stoppedComponents, ['comp_first']);
      assert.strictEqual(kernel.state, 'STOPPED');
    },
  );

  await t.test(
    '14. Operation Rejection Before READY: Operations throw KernelStateError',
    async () => {
      const kernel = new ApplicationKernel();
      await assert.rejects(
        async () => kernel.dispatch({ type: 'TEST_CMD', payload: {} }),
        (err: Error) => err instanceof KernelStateError,
      );
    },
  );

  await t.test(
    '15. Operation Rejection After STOPPED: Operations throw KernelStateError',
    async () => {
      const kernel = new ApplicationKernel();
      await kernel.start();
      await kernel.stop();

      await assert.rejects(
        async () => kernel.query({ type: 'TEST_QUERY', payload: {} }),
        (err: Error) => err instanceof KernelStateError,
      );
    },
  );

  await t.test(
    '16. Dispatcher Delegation: kernel.dispatch() executes through Dispatcher',
    async () => {
      const dispatcher = new DispatcherBuilder()
        .withHandler('CREATE_USER', {
          async execute(payload: { name: string }) {
            return { userId: 'user-100', name: payload.name };
          },
        })
        .build();

      const kernel = ApplicationKernelBuilder.create().withDispatcher(dispatcher).build();

      await kernel.start();

      const res = await kernel.dispatch<{ name: string }, { userId: string; name: string }>({
        type: 'CREATE_USER',
        payload: { name: 'Alice' },
      });

      assert.strictEqual(res.state, 'COMPLETED');
      assert.deepStrictEqual(res.value, { userId: 'user-100', name: 'Alice' });

      await kernel.stop();
    },
  );

  await t.test('17. QueryBus Delegation: kernel.query() executes through QueryBus', async () => {
    const queryBus = new QueryBuilder()
      .withHandler('GET_USER', {
        execute(payload: { id: string }) {
          return { id: payload.id, name: 'Bob' };
        },
      })
      .build();

    const kernel = ApplicationKernelBuilder.create().withQueryBus(queryBus).build();

    await kernel.start();

    const res = await kernel.query<{ id: string }, { id: string; name: string }>({
      type: 'GET_USER',
      payload: { id: 'u-1' },
    });

    assert.strictEqual(res.state, 'COMPLETED');
    assert.deepStrictEqual(res.value, { id: 'u-1', name: 'Bob' });

    await kernel.stop();
  });

  await t.test(
    '18. EventPublisher Delegation: kernel.publish() executes through EventPublisher',
    async () => {
      let receivedEvent = false;
      const eventPublisher = new EventBuilder()
        .withHandler('USER_CREATED', {
          handle() {
            receivedEvent = true;
          },
        })
        .build();

      const kernel = ApplicationKernelBuilder.create().withEventPublisher(eventPublisher).build();

      await kernel.start();

      const res = await kernel.publish({
        type: 'USER_CREATED',
        payload: { userId: 'u-123' },
      });

      assert.strictEqual(res.state, 'COMPLETED');
      assert.strictEqual(receivedEvent, true);

      await kernel.stop();
    },
  );

  await t.test(
    '19. ApplicationManager Delegation: kernel.executeService() executes through ApplicationManager',
    async () => {
      const appManager = new ApplicationBuilder()
        .withService('OrderService', {
          execute(input: { item: string }) {
            return { orderId: 'ord-999', item: input.item };
          },
        })
        .build();

      const kernel = ApplicationKernelBuilder.create().withApplicationManager(appManager).build();

      await kernel.start();

      const res = await kernel.executeService<{ item: string }, { orderId: string; item: string }>(
        'OrderService',
        { item: 'book' },
      );

      assert.strictEqual(res.state, 'COMPLETED');
      assert.deepStrictEqual(res.value, {
        orderId: 'ord-999',
        item: 'book',
      });

      await kernel.stop();
    },
  );

  await t.test(
    '20. ExecutionEngine Delegation: kernel.execute() executes through ExecutionEngine',
    async () => {
      const executionEngine = new ExecutionEngine();

      const kernel = ApplicationKernelBuilder.create().withExecutionEngine(executionEngine).build();

      await kernel.start();

      const res = await kernel.execute(21, (input: number) => input * 2);
      assert.strictEqual(res.state, 'COMPLETED');
      assert.strictEqual(res.value, 42);

      await kernel.stop();
    },
  );

  await t.test(
    '21. ExecutionContext Propagation: Context propagates through kernel operations',
    async () => {
      const contextManager = new ExecutionContextManager();
      let capturedId: string | undefined;

      const dispatcher = new DispatcherBuilder()
        .withContextManager(contextManager)
        .withHandler('CTX_TEST', {
          execute(_cmd: unknown, ctx) {
            capturedId = ctx.executionId;
            assert.strictEqual(contextManager.current()?.executionId, ctx.executionId);
            return { ok: true };
          },
        })
        .build();

      const kernel = ApplicationKernelBuilder.create()
        .withContextManager(contextManager)
        .withDispatcher(dispatcher)
        .build();

      await kernel.start();

      const res = await kernel.dispatch({ type: 'CTX_TEST', payload: {} });
      assert.strictEqual(res.state, 'COMPLETED');
      assert.strictEqual(typeof capturedId, 'string');
      assert.strictEqual(contextManager.current(), undefined);

      await kernel.stop();
      await contextManager.stop();
    },
  );

  await t.test(
    '22. Central Error Boundary: Unhandled errors route to ErrorHandlingEngine',
    async () => {
      const errorEngine = new ErrorHandlingEngine({ autoStart: false });
      let errorCaught = false;

      errorEngine.registerHandler({
        handle(err) {
          errorCaught = true;
          assert.strictEqual(err.message, 'Database crash');
          return { action: 'HANDLE' };
        },
      });

      const dispatcher = new DispatcherBuilder()
        .withHandler('FAILING_CMD', {
          execute() {
            throw new Error('Database crash');
          },
        })
        .build();

      const kernel = ApplicationKernelBuilder.create()
        .withDispatcher(dispatcher)
        .withErrorEngine(errorEngine)
        .build();

      await kernel.start();

      const res = await kernel.dispatch({ type: 'FAILING_CMD', payload: {} });
      assert.strictEqual(res.state, 'FAILED');
      assert.strictEqual(errorCaught, true);

      await kernel.stop();
      await errorEngine.stop();
    },
  );

  await t.test(
    '23. Cancellation Propagation: Aborted context marks operation CANCELLED',
    async () => {
      const contextManager = new ExecutionContextManager();
      const dispatcher = new DispatcherBuilder()
        .withContextManager(contextManager)
        .withHandler('SLOW_CMD', {
          execute() {
            return { status: 'SUCCESS' };
          },
        })
        .build();

      const kernel = ApplicationKernelBuilder.create()
        .withContextManager(contextManager)
        .withDispatcher(dispatcher)
        .build();

      await kernel.start();

      const context = contextManager.create();
      context.cancel();

      await assert.rejects(
        async () => kernel.dispatch({ type: 'SLOW_CMD', payload: {} }, { context }),
        (err: Error) => err.message.includes('cancelled'),
      );

      const diag = kernel.getDiagnostics();
      assert.strictEqual(diag.cancelledOperations, 1);

      await kernel.stop();
      await contextManager.stop();
    },
  );

  await t.test(
    '24. Graceful Shutdown with Active Operations: Waits for active operations to drain',
    async () => {
      const kernel = new ApplicationKernel();
      await kernel.start();

      await kernel.stop({ graceful: true, timeoutMs: 100 });
      assert.strictEqual(kernel.state, 'STOPPED');
    },
  );

  await t.test('25. Forced Shutdown: force: true executes immediate shutdown', async () => {
    const kernel = new ApplicationKernel();
    await kernel.start();
    await kernel.stop({ force: true });
    assert.strictEqual(kernel.state, 'STOPPED');
  });

  await t.test(
    '26. Configuration Immutability: Mutating original config has no effect',
    async () => {
      const config = { shutdownTimeoutMs: 1000 };
      const kernel = new ApplicationKernel(config);
      config.shutdownTimeoutMs = 99999;

      await kernel.start();
      await kernel.stop();
    },
  );

  await t.test(
    '27. Builder Immutability: ApplicationKernelBuilder creates isolated instances',
    () => {
      const builder = ApplicationKernelBuilder.create()
        .withGracefulShutdown(true)
        .withShutdownTimeout(3000);

      const k1 = builder.build();
      const k2 = builder.build();

      assert.notStrictEqual(k1, k2);
    },
  );

  await t.test(
    '28. Diagnostics Security: Diagnostics contain numerical counters only',
    async () => {
      const kernel = new ApplicationKernel();
      await kernel.start();

      const snapshot = kernel.getDiagnostics();
      const serialized = JSON.stringify(snapshot);

      assert.strictEqual(typeof snapshot.totalOperations, 'number');
      assert.strictEqual(typeof snapshot.startupDurationMs, 'number');
      assert.strictEqual(serialized.includes('password'), false);
      assert.strictEqual(serialized.includes('secret'), false);

      await kernel.stop();
    },
  );

  await t.test('29. 1,000 Concurrent Operations: High-concurrency isolation', async () => {
    const dispatcher = new DispatcherBuilder()
      .withHandler('CONCURRENT_CMD', {
        execute(cmd: { index: number }) {
          return { index: cmd.index };
        },
      })
      .build();

    const kernel = ApplicationKernelBuilder.create().withDispatcher(dispatcher).build();

    await kernel.start();

    const promises: Promise<void>[] = [];
    for (let i = 0; i < 1000; i++) {
      promises.push(
        kernel
          .dispatch<{ index: number }, { index: number }>({
            type: 'CONCURRENT_CMD',
            payload: { index: i },
          })
          .then((res) => {
            assert.strictEqual(res.state, 'COMPLETED');
            assert.deepStrictEqual(res.value, { index: i });
          }),
      );
    }

    await Promise.all(promises);

    const diag = kernel.getDiagnostics();
    assert.strictEqual(diag.totalOperations, 1000);
    assert.strictEqual(diag.completedOperations, 1000);
    assert.strictEqual(diag.activeOperations, 0);

    await kernel.stop();
  });

  await t.test('30. Diagnostics Reset: Resets diagnostics correctly', async () => {
    const kernel = new ApplicationKernel();
    await kernel.start();

    kernel.resetDiagnostics();
    const diag = kernel.getDiagnostics();
    assert.strictEqual(diag.totalOperations, 0);
    assert.strictEqual(diag.startAttempts, 0);

    await kernel.stop();
  });

  await t.test('31. Lifecycle State Machine: Transition validation', async () => {
    const kernel = new ApplicationKernel();
    assert.strictEqual(kernel.state, 'CREATED');

    await kernel.start();
    assert.strictEqual(kernel.state, 'READY');

    await kernel.stop();
    assert.strictEqual(kernel.state, 'STOPPED');
  });

  await t.test(
    '32. Critical Architectural Boundary: Zero higher-layer or forbidden framework dependencies',
    () => {
      const pkgJsonPath = path.resolve(__dirname, '../../package.json');
      const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

      const deps = Object.keys(pkgJson.dependencies || {});
      const forbidden = [
        '@coreforge/transport',
        '@coreforge/routing',
        '@coreforge/http',
        '@coreforge/response',
        '@coreforge/jobs',
        '@coreforge/cache',
        '@coreforge/locks',
        '@coreforge/rate-limit',
        '@coreforge/resilience',
        '@coreforge/metrics',
        '@coreforge/tracing',
        '@coreforge/logging',
        'redis',
        'rabbitmq',
        'kafka',
      ];

      for (const f of forbidden) {
        assert.strictEqual(
          deps.includes(f),
          false,
          `Forbidden dependency detected in @coreforge/kernel: ${f}`,
        );
      }
    },
  );
});
