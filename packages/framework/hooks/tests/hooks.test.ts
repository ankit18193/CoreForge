import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { test } from 'node:test';

import { ExecutionContextManager } from '@coreforge/execution-context';

import {
  Hook,
  HookBuilder,
  HookDuplicateError,
  HookExecutionError,
  HookLifecycleError,
  HookManager,
  HookRegistrationError,
  HookRegistry,
  HookResolver,
  HookStateError,
  HookType,
} from '../src/index';

test('CoreForge Application Lifecycle Hooks & Execution Hooks Engine (@coreforge/hooks)', async (t) => {
  await t.test('1. Hook Registration: Validates ID, type, priority, and retrieval', () => {
    const registry = new HookRegistry();
    assert.strictEqual(registry.size, 0);

    const hook: Hook = {
      id: 'hook_1',
      type: 'BEFORE_START',
      execute() {},
    };

    registry.register(hook, { priority: 10 });
    assert.strictEqual(registry.size, 1);
    assert.strictEqual(registry.has('hook_1'), true);

    const entry = registry.get('hook_1');
    assert.ok(entry);
    assert.strictEqual(entry?.id, 'hook_1');
    assert.strictEqual(entry?.type, 'BEFORE_START');
    assert.strictEqual(entry?.priority, 10);
    assert.strictEqual(entry?.sequence, 1);
  });

  await t.test('2. Duplicate Hook Rejection: Throws HookDuplicateError', () => {
    const registry = new HookRegistry();
    const hook: Hook = {
      id: 'dup_hook',
      type: 'BEFORE_EXECUTE',
      execute() {},
    };

    registry.register(hook);
    assert.throws(
      () => registry.register(hook),
      (err: Error) => err instanceof HookDuplicateError,
    );
  });

  await t.test(
    '3. Invalid Hook Validation: Throws HookRegistrationError for malformed hooks',
    () => {
      const registry = new HookRegistry();

      // Empty ID
      assert.throws(
        () => registry.register({ id: '', type: 'BEFORE_START', execute() {} }),
        (err: Error) => err instanceof HookRegistrationError,
      );

      // Invalid type
      assert.throws(
        () =>
          registry.register({
            id: 'bad_type',
            type: 'INVALID_TYPE' as unknown as HookType,
            execute() {},
          }),
        (err: Error) => err instanceof HookRegistrationError,
      );

      // Missing execute
      assert.throws(
        () =>
          registry.register({
            id: 'no_exec',
            type: 'BEFORE_START',
          } as unknown as Hook),
        (err: Error) => err instanceof HookRegistrationError,
      );
    },
  );

  await t.test('4. Priority Ordering: Highest priority executes first', () => {
    const registry = new HookRegistry();

    registry.register({ id: 'prio_low', type: 'BEFORE_START', execute() {} }, { priority: 1 });
    registry.register({ id: 'prio_high', type: 'BEFORE_START', execute() {} }, { priority: 100 });
    registry.register({ id: 'prio_mid', type: 'BEFORE_START', execute() {} }, { priority: 50 });

    const order = HookResolver.resolveExecutionOrder(registry, 'BEFORE_START').map((e) => e.id);
    assert.deepStrictEqual(order, ['prio_high', 'prio_mid', 'prio_low']);
  });

  await t.test('5. Registration Sequence Ordering: Sequence breaks priority ties', () => {
    const registry = new HookRegistry();

    registry.register({ id: 'first', type: 'BEFORE_START', execute() {} }, { priority: 10 });
    registry.register({ id: 'second', type: 'BEFORE_START', execute() {} }, { priority: 10 });
    registry.register({ id: 'third', type: 'BEFORE_START', execute() {} }, { priority: 10 });

    const order = HookResolver.resolveExecutionOrder(registry, 'BEFORE_START').map((e) => e.id);
    assert.deepStrictEqual(order, ['first', 'second', 'third']);
  });

  await t.test(
    '6. Before-Hook Forward Execution: Executes in deterministic forward order (A -> B -> C)',
    async () => {
      const executed: string[] = [];
      const manager = new HookManager();

      manager.register(
        {
          id: 'hook_A',
          type: 'BEFORE_EXECUTE',
          execute() {
            executed.push('A');
          },
        },
        { priority: 30 },
      );

      manager.register(
        {
          id: 'hook_B',
          type: 'BEFORE_EXECUTE',
          execute() {
            executed.push('B');
          },
        },
        { priority: 20 },
      );

      manager.register(
        {
          id: 'hook_C',
          type: 'BEFORE_EXECUTE',
          execute() {
            executed.push('C');
          },
        },
        { priority: 10 },
      );

      await manager.start();

      const result = await manager.execute('BEFORE_EXECUTE');
      assert.strictEqual(result.success, true);
      assert.deepStrictEqual(executed, ['A', 'B', 'C']);

      await manager.stop();
    },
  );

  await t.test(
    '7. After-Hook Reverse Unwinding: Executes in reverse order (C -> B -> A)',
    async () => {
      const executed: string[] = [];
      const manager = new HookManager();

      manager.register(
        {
          id: 'after_A',
          type: 'AFTER_EXECUTE',
          execute() {
            executed.push('A');
          },
        },
        { priority: 30 },
      );

      manager.register(
        {
          id: 'after_B',
          type: 'AFTER_EXECUTE',
          execute() {
            executed.push('B');
          },
        },
        { priority: 20 },
      );

      manager.register(
        {
          id: 'after_C',
          type: 'AFTER_EXECUTE',
          execute() {
            executed.push('C');
          },
        },
        { priority: 10 },
      );

      await manager.start();

      const result = await manager.execute('AFTER_EXECUTE');
      assert.strictEqual(result.success, true);
      assert.deepStrictEqual(executed, ['C', 'B', 'A']);

      await manager.stop();
    },
  );

  await t.test('8. BEFORE_START Category: Executes successfully before startup', async () => {
    let triggered = false;
    const manager = new HookManager();

    manager.register({
      id: 'bs_hook',
      type: 'BEFORE_START',
      execute() {
        triggered = true;
      },
    });

    await manager.start();
    await manager.execute('BEFORE_START');
    assert.strictEqual(triggered, true);

    await manager.stop();
  });

  await t.test('9. AFTER_START Category: Executes successfully after startup', async () => {
    let triggered = false;
    const manager = new HookManager();

    manager.register({
      id: 'as_hook',
      type: 'AFTER_START',
      execute() {
        triggered = true;
      },
    });

    await manager.start();
    await manager.execute('AFTER_START');
    assert.strictEqual(triggered, true);

    await manager.stop();
  });

  await t.test('10. BEFORE_STOP Category: Executes successfully before stop', async () => {
    let triggered = false;
    const manager = new HookManager();

    manager.register({
      id: 'bstop_hook',
      type: 'BEFORE_STOP',
      execute() {
        triggered = true;
      },
    });

    await manager.start();
    await manager.execute('BEFORE_STOP');
    assert.strictEqual(triggered, true);

    await manager.stop();
  });

  await t.test('11. AFTER_STOP Category: Executes in STOPPING/STOPPED mode', async () => {
    let triggered = false;
    const manager = new HookManager();

    manager.register({
      id: 'astop_hook',
      type: 'AFTER_STOP',
      execute() {
        triggered = true;
      },
    });

    await manager.start();
    await manager.execute('AFTER_STOP');
    assert.strictEqual(triggered, true);

    await manager.stop();
  });

  await t.test('12. BEFORE_EXECUTE Category: Passes payload to hook execution', async () => {
    let receivedPayload: unknown;
    const manager = new HookManager();

    manager.register({
      id: 'bexec_hook',
      type: 'BEFORE_EXECUTE',
      execute(payload) {
        receivedPayload = payload;
      },
    });

    await manager.start();
    await manager.execute('BEFORE_EXECUTE', { command: 'CreateUser' });
    assert.deepStrictEqual(receivedPayload, { command: 'CreateUser' });

    await manager.stop();
  });

  await t.test('13. AFTER_EXECUTE Category: Passes result payload to hook execution', async () => {
    let receivedPayload: unknown;
    const manager = new HookManager();

    manager.register({
      id: 'aexec_hook',
      type: 'AFTER_EXECUTE',
      execute(payload) {
        receivedPayload = payload;
      },
    });

    await manager.start();
    await manager.execute('AFTER_EXECUTE', { result: 'UserCreated', userId: 'u-123' });
    assert.deepStrictEqual(receivedPayload, { result: 'UserCreated', userId: 'u-123' });

    await manager.stop();
  });

  await t.test('14. ON_ERROR Category: Dispatches on error with error payload', async () => {
    let capturedError: unknown;
    const manager = new HookManager();

    manager.register({
      id: 'err_hook',
      type: 'ON_ERROR',
      execute(payload) {
        capturedError = payload;
      },
    });

    await manager.start();
    await manager.execute('ON_ERROR', { error: 'Database connection failed' });
    assert.deepStrictEqual(capturedError, { error: 'Database connection failed' });

    await manager.stop();
  });

  await t.test(
    '15. Exactly-Once Invocation: Each hook executes exactly once per dispatch batch',
    async () => {
      let executionCount = 0;
      const manager = new HookManager();

      manager.register({
        id: 'once_hook',
        type: 'BEFORE_EXECUTE',
        execute() {
          executionCount++;
        },
      });

      await manager.start();
      await manager.execute('BEFORE_EXECUTE');
      assert.strictEqual(executionCount, 1);

      await manager.stop();
    },
  );

  await t.test(
    '16. CONTINUE Failure Strategy: Continues executing remaining hooks on failure',
    async () => {
      const executed: string[] = [];
      const manager = new HookManager();

      manager.register(
        {
          id: 'h1',
          type: 'BEFORE_EXECUTE',
          execute() {
            executed.push('h1');
          },
        },
        { priority: 30, failureStrategy: 'CONTINUE' },
      );

      manager.register(
        {
          id: 'h2_fail',
          type: 'BEFORE_EXECUTE',
          execute() {
            executed.push('h2');
            throw new Error('h2 crash');
          },
        },
        { priority: 20, failureStrategy: 'CONTINUE' },
      );

      manager.register(
        {
          id: 'h3',
          type: 'BEFORE_EXECUTE',
          execute() {
            executed.push('h3');
          },
        },
        { priority: 10, failureStrategy: 'CONTINUE' },
      );

      await manager.start();

      const batchResult = await manager.execute('BEFORE_EXECUTE');
      assert.strictEqual(batchResult.success, false);
      assert.strictEqual(batchResult.failedHooks, 1);
      assert.strictEqual(batchResult.executedHooks, 2);
      assert.deepStrictEqual(executed, ['h1', 'h2', 'h3']);

      await manager.stop();
    },
  );

  await t.test(
    '17. STOP Failure Strategy: Halts remaining hooks on failure, marking them skipped',
    async () => {
      const executed: string[] = [];
      const manager = new HookManager();

      manager.register(
        {
          id: 'h1',
          type: 'BEFORE_EXECUTE',
          execute() {
            executed.push('h1');
          },
        },
        { priority: 30, failureStrategy: 'STOP' },
      );

      manager.register(
        {
          id: 'h2_fail',
          type: 'BEFORE_EXECUTE',
          execute() {
            executed.push('h2');
            throw new Error('h2 stop crash');
          },
        },
        { priority: 20, failureStrategy: 'STOP' },
      );

      manager.register(
        {
          id: 'h3',
          type: 'BEFORE_EXECUTE',
          execute() {
            executed.push('h3');
          },
        },
        { priority: 10, failureStrategy: 'STOP' },
      );

      await manager.start();

      const batchResult = await manager.execute('BEFORE_EXECUTE');
      assert.strictEqual(batchResult.success, false);
      assert.strictEqual(batchResult.failedHooks, 1);
      assert.strictEqual(batchResult.skippedHooks, 1);
      assert.deepStrictEqual(executed, ['h1', 'h2']);

      const diag = manager.getDiagnostics();
      assert.strictEqual(diag.skippedHookExecutions, 1);

      await manager.stop();
    },
  );

  await t.test('18. FAIL_FAST Failure Strategy: Throws immediately on failure', async () => {
    const manager = new HookManager();

    manager.register(
      {
        id: 'fail_fast_hook',
        type: 'BEFORE_EXECUTE',
        execute() {
          throw new Error('Immediate crash');
        },
      },
      { failureStrategy: 'FAIL_FAST' },
    );

    await manager.start();

    await assert.rejects(
      async () => manager.execute('BEFORE_EXECUTE'),
      (err: Error) => err instanceof HookExecutionError,
    );

    await manager.stop();
  });

  await t.test('19. Lifecycle FAIL_FAST: Lifecycle hook throws HookLifecycleError', async () => {
    const manager = new HookManager();

    manager.register(
      {
        id: 'lf_fail_hook',
        type: 'BEFORE_START',
        execute() {
          throw new Error('Startup blocked');
        },
      },
      { failureStrategy: 'FAIL_FAST' },
    );

    await manager.start();

    await assert.rejects(
      async () => manager.execute('BEFORE_START'),
      (err: Error) => err instanceof HookLifecycleError,
    );

    await manager.stop();
  });

  await t.test(
    '20. Cancellation Handling: Aborted ExecutionContext marks hook CANCELLED',
    async () => {
      const contextManager = new ExecutionContextManager();
      const manager = new HookManager({ contextManager });

      manager.register({
        id: 'canc_hook',
        type: 'BEFORE_EXECUTE',
        execute() {},
      });

      await manager.start();

      const context = contextManager.create();
      context.cancel();

      const res = await manager.execute('BEFORE_EXECUTE', {}, { context });
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.cancelledHooks, 1);
      assert.strictEqual(res.results[0]?.state, 'CANCELLED');

      const diag = manager.getDiagnostics();
      assert.strictEqual(diag.cancelledHookExecutions, 1);

      await manager.stop();
    },
  );

  await t.test(
    '21. ExecutionContext Propagation: AsyncLocalStorage context propagates to hooks',
    async () => {
      const contextManager = new ExecutionContextManager();
      let capturedId: string | undefined;

      const manager = new HookManager({ contextManager });

      manager.register({
        id: 'ctx_hook',
        type: 'BEFORE_EXECUTE',
        execute(_payload, ctx) {
          capturedId = ctx?.executionId;
          assert.strictEqual(contextManager.current()?.executionId, ctx?.executionId);
        },
      });

      await manager.start();

      const context = contextManager.create({ autoStart: true });
      await manager.execute('BEFORE_EXECUTE', {}, { context });

      assert.strictEqual(capturedId, context.executionId);

      await manager.stop();
    },
  );

  await t.test(
    '22. Lifecycle Restrictions: Rejects operations before READY or after STOPPED',
    async () => {
      const manager = new HookManager();
      assert.strictEqual(manager.state, 'CREATED');

      await assert.rejects(
        async () => manager.execute('BEFORE_EXECUTE'),
        (err: Error) => err instanceof HookStateError,
      );

      await manager.start();
      assert.strictEqual(manager.state, 'READY');

      await manager.stop();
      assert.strictEqual(manager.state, 'STOPPED');

      await assert.rejects(
        async () => manager.execute('BEFORE_EXECUTE'),
        (err: Error) => err instanceof HookStateError,
      );
    },
  );

  await t.test('23. Registration Locking: Rejects registration after start()', async () => {
    const manager = new HookManager();
    await manager.start();

    assert.throws(
      () =>
        manager.register({
          id: 'late_hook',
          type: 'BEFORE_START',
          execute() {},
        }),
      (err: Error) => err instanceof HookRegistrationError,
    );

    await manager.stop();
  });

  await t.test('24. Deep Result Immutability: Execution results are frozen', async () => {
    const manager = new HookManager();
    manager.register({
      id: 'imm_hook',
      type: 'BEFORE_EXECUTE',
      execute() {
        return { data: 123 };
      },
    });

    await manager.start();

    const batch = await manager.execute('BEFORE_EXECUTE');
    assert.strictEqual(Object.isFrozen(batch), true);
    assert.strictEqual(Object.isFrozen(batch.results), true);
    assert.strictEqual(Object.isFrozen(batch.results[0]), true);

    await manager.stop();
  });

  await t.test(
    '25. Builder Immutability: HookBuilder creates isolated HookManager instances',
    () => {
      const builder = HookBuilder.create()
        .withDefaultFailureStrategy('STOP')
        .withDefaultTimeout(1000)
        .withHook({
          id: 'b_hook',
          type: 'BEFORE_START',
          execute() {},
        });

      const m1 = builder.build();
      const m2 = builder.build();

      assert.notStrictEqual(m1, m2);
      assert.strictEqual(m1.size, 1);
      assert.strictEqual(m2.size, 1);
    },
  );

  await t.test(
    '26. High-Concurrency: 1,000 concurrent hook dispatches maintain isolation',
    async () => {
      const manager = new HookManager();

      manager.register({
        id: 'conc_hook',
        type: 'BEFORE_EXECUTE',
        execute(payload: { index: number }) {
          return payload.index * 2;
        },
      });

      await manager.start();

      const promises: Promise<void>[] = [];
      for (let i = 0; i < 1000; i++) {
        promises.push(
          manager.execute('BEFORE_EXECUTE', { index: i }).then((res) => {
            assert.strictEqual(res.success, true);
            assert.strictEqual(res.results[0]?.value, i * 2);
          }),
        );
      }

      await Promise.all(promises);

      const diag = manager.getDiagnostics();
      assert.strictEqual(diag.totalHookExecutions, 1000);
      assert.strictEqual(diag.successfulHookExecutions, 1000);
      assert.strictEqual(diag.activeHookExecutions, 0);

      await manager.stop();
    },
  );

  await t.test(
    '27. Diagnostics Security: Diagnostics contain numerical counters only',
    async () => {
      const manager = new HookManager();
      await manager.start();

      const snapshot = manager.getDiagnostics();
      const serialized = JSON.stringify(snapshot);

      assert.strictEqual(typeof snapshot.totalHookExecutions, 'number');
      assert.strictEqual(typeof snapshot.averageDurationMs, 'number');
      assert.strictEqual(serialized.includes('password'), false);
      assert.strictEqual(serialized.includes('secret'), false);

      await manager.stop();
    },
  );

  await t.test('28. Diagnostics Reset: Resets counters correctly', async () => {
    const manager = new HookManager();
    manager.register({ id: 'h1', type: 'BEFORE_EXECUTE', execute() {} });
    await manager.start();
    await manager.execute('BEFORE_EXECUTE');

    manager.resetDiagnostics();
    const diag = manager.getDiagnostics();
    assert.strictEqual(diag.totalHookExecutions, 0);
    assert.strictEqual(diag.successfulHookExecutions, 0);

    await manager.stop();
  });

  await t.test(
    '29. Critical Architectural Boundary: Zero dependency on @coreforge/kernel or forbidden packages',
    () => {
      const pkgJsonPath = path.resolve(__dirname, '../../package.json');
      const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

      const deps = Object.keys(pkgJson.dependencies || {});
      const forbidden = [
        '@coreforge/kernel',
        '@coreforge/transport',
        '@coreforge/routing',
        '@coreforge/http',
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
        'redis',
        'rabbitmq',
        'kafka',
      ];

      for (const f of forbidden) {
        assert.strictEqual(
          deps.includes(f),
          false,
          `Forbidden dependency detected in @coreforge/hooks: ${f}`,
        );
      }
    },
  );
});
