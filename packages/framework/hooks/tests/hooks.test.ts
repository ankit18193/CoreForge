import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { test } from 'node:test';

import {
  Hook,
  HookDuplicateError,
  HookRegistrationError,
  HookRegistry,
  HookResolver,
  HookResultFactory,
} from '../src/index';

test('CoreForge Application Lifecycle Hooks & Execution Hooks Engine (@coreforge/hooks) - Stage 1', async (t) => {
  await t.test('1. Hook Registration: Validates ID, type, and size', () => {
    const registry = new HookRegistry();
    assert.strictEqual(registry.size, 0);

    const hook: Hook = {
      id: 'hook_1',
      type: 'BEFORE_START',
      execute() {},
    };

    registry.register(hook);
    assert.strictEqual(registry.size, 1);
    assert.strictEqual(registry.has('hook_1'), true);

    const entry = registry.get('hook_1');
    assert.ok(entry);
    assert.strictEqual(entry?.id, 'hook_1');
    assert.strictEqual(entry?.type, 'BEFORE_START');
    assert.strictEqual(entry?.priority, 0);
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
            type: 'INVALID_TYPE' as unknown as import('../src/index').HookType,
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

  await t.test('4. Priority & Sequence Ordering: High priority first, sequence breaks ties', () => {
    const registry = new HookRegistry();

    registry.register({ id: 'low_prio', type: 'BEFORE_START', execute() {} }, { priority: -10 });
    registry.register({ id: 'high_prio_1', type: 'BEFORE_START', execute() {} }, { priority: 100 });
    registry.register({ id: 'default_prio_1', type: 'BEFORE_START', execute() {} });
    registry.register({ id: 'high_prio_2', type: 'BEFORE_START', execute() {} }, { priority: 100 });
    registry.register({ id: 'default_prio_2', type: 'BEFORE_START', execute() {} });

    const order = HookResolver.resolveExecutionOrder(registry, 'BEFORE_START').map((e) => e.id);
    assert.deepStrictEqual(order, [
      'high_prio_1',
      'high_prio_2',
      'default_prio_1',
      'default_prio_2',
      'low_prio',
    ]);
  });

  await t.test(
    '5. After-Hook Reverse Unwinding: AFTER_* hooks execute in reverse order (C -> B -> A)',
    () => {
      const registry = new HookRegistry();

      registry.register({ id: 'h1', type: 'AFTER_EXECUTE', execute() {} }, { priority: 10 });
      registry.register({ id: 'h2', type: 'AFTER_EXECUTE', execute() {} }, { priority: 5 });
      registry.register({ id: 'h3', type: 'AFTER_EXECUTE', execute() {} }, { priority: 1 });

      const resolvedOrder = HookResolver.resolveExecutionOrder(registry, 'AFTER_EXECUTE').map(
        (e) => e.id,
      );

      // Should be reversed: h3 -> h2 -> h1
      assert.deepStrictEqual(resolvedOrder, ['h3', 'h2', 'h1']);
    },
  );

  await t.test('6. Registration Lock: Throws HookRegistrationError after lock()', () => {
    const registry = new HookRegistry();
    registry.register({ id: 'pre_lock', type: 'BEFORE_START', execute() {} });

    registry.lock();
    assert.strictEqual(registry.isLocked, true);

    assert.throws(
      () => registry.register({ id: 'post_lock', type: 'BEFORE_START', execute() {} }),
      (err: Error) => err instanceof HookRegistrationError,
    );
  });

  await t.test('7. Result Factory: Produces deeply frozen single and batch results', () => {
    const single = HookResultFactory.createSingleResult({
      hookId: 'h1',
      type: 'BEFORE_START',
      state: 'COMPLETED',
      success: true,
      value: { data: 'test' },
      durationMs: 1.234,
    });

    assert.strictEqual(single.hookId, 'h1');
    assert.strictEqual(single.success, true);
    assert.strictEqual(single.durationMs, 1.23);
    assert.strictEqual(Object.isFrozen(single), true);

    const batch = HookResultFactory.createBatchResult({
      type: 'BEFORE_START',
      results: [single],
      durationMs: 2.345,
    });

    assert.strictEqual(batch.type, 'BEFORE_START');
    assert.strictEqual(batch.totalHooks, 1);
    assert.strictEqual(batch.executedHooks, 1);
    assert.strictEqual(batch.failedHooks, 0);
    assert.strictEqual(batch.success, true);
    assert.strictEqual(Object.isFrozen(batch), true);
    assert.strictEqual(Object.isFrozen(batch.results), true);
  });

  await t.test(
    '8. Critical Architectural Boundary: Zero dependency on @coreforge/kernel or forbidden packages',
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
