import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { test } from 'node:test';

import {
  ExecutionContextBuilder,
  ExecutionContextManager,
  ExecutionContextStateError,
  ExecutionIdError,
  ExecutionIdGenerator,
  ExecutionLimitError,
  ExecutionMetadataError,
} from '../src/index';

test('CoreForge Application Execution Context Engine (@coreforge/execution-context)', async (t) => {
  await t.test(
    '1. Execution ID Generation & Validation: 32 lowercase hex chars and zero rejection',
    async () => {
      const id = ExecutionIdGenerator.generate();
      assert.strictEqual(id.length, 32);
      assert.strictEqual(/^[0-9a-f]{32}$/.test(id), true);
      assert.strictEqual(ExecutionIdGenerator.validate(id), id);

      // Rejection of invalid IDs
      assert.throws(
        () => ExecutionIdGenerator.validate('too_short'),
        (err: Error) => err instanceof ExecutionIdError,
      );
      assert.throws(
        () => ExecutionIdGenerator.validate('0'.repeat(32)),
        (err: Error) => err instanceof ExecutionIdError,
      );
      assert.throws(
        () => ExecutionIdGenerator.validate('g'.repeat(32)),
        (err: Error) => err instanceof ExecutionIdError,
      );
    },
  );

  await t.test(
    '2. Metadata Validation: Empty, whitespace-only, or control character keys rejected',
    async () => {
      const manager = new ExecutionContextManager();

      assert.throws(
        () => manager.create({ metadata: { '': 'empty_key' } }),
        (err: Error) => err instanceof ExecutionMetadataError,
      );
      assert.throws(
        () => manager.create({ metadata: { '   ': 'whitespace_key' } }),
        (err: Error) => err instanceof ExecutionMetadataError,
      );
      assert.throws(
        () => manager.create({ metadata: { 'bad\x00key': 'control_char' } }),
        (err: Error) => err instanceof ExecutionMetadataError,
      );

      await manager.stop();
    },
  );

  await t.test(
    '3. Metadata Immutability: Mutating original input object does not alter context',
    async () => {
      const manager = new ExecutionContextManager();

      const original = { user: 'Alice', details: { role: 'admin' } };
      const context = manager.create({ metadata: original });

      original.user = 'Bob';
      original.details.role = 'guest';

      assert.strictEqual(context.metadata.user, 'Alice');
      assert.strictEqual((context.metadata.details as Record<string, unknown>).role, 'admin');

      assert.throws(() => {
        (context.metadata as Record<string, unknown>).user = 'Hacker';
      });

      await manager.stop();
    },
  );

  await t.test('4. Sensitive Metadata Redaction & Circular Reference Protection', async () => {
    const manager = new ExecutionContextManager();

    const circular: Record<string, unknown> = { name: 'circular_metadata' };
    circular.loop = circular;

    const context = manager.create({
      metadata: {
        password: 'mypassword123',
        APIKEY: 'sec_key_xyz',
        Authorization: 'Bearer auth_token',
        cookie: 'sid=abc',
        secret: 'vault_secret',
        nested: circular,
      },
    });

    assert.strictEqual(context.metadata.password, '[REDACTED]');
    assert.strictEqual(context.metadata.APIKEY, '[REDACTED]');
    assert.strictEqual(context.metadata.Authorization, '[REDACTED]');
    assert.strictEqual(context.metadata.cookie, '[REDACTED]');
    assert.strictEqual(context.metadata.secret, '[REDACTED]');

    const nested = context.metadata.nested as Record<string, unknown>;
    assert.strictEqual(nested.name, 'circular_metadata');
    assert.strictEqual(nested.loop, '[Circular]');

    await manager.stop();
  });

  await t.test(
    '5. Non-Destructive Metadata Limits: Exceeding maxKeys / maxDepth rejects operation',
    async () => {
      const manager = new ExecutionContextManager({
        metadataLimits: { maxKeys: 2, maxDepth: 2 },
      });

      // 3 keys exceeds maxKeys (2)
      assert.throws(
        () => manager.create({ metadata: { k1: '1', k2: '2', k3: '3' } }),
        (err: Error) => err instanceof ExecutionLimitError,
      );

      // Deep nested object exceeds maxDepth (2)
      assert.throws(
        () =>
          manager.create({
            metadata: { k1: { l2: { l3: 'too deep' } } },
          }),
        (err: Error) => err instanceof ExecutionLimitError,
      );

      const diag = manager.getDiagnostics();
      assert.strictEqual(diag.metadataRejections, 2);

      await manager.stop();
    },
  );

  await t.test(
    '6. Explicit Lifecycle & Duration: CREATED -> ACTIVE -> COMPLETED with durationMs',
    async () => {
      const manager = new ExecutionContextManager();

      const context = manager.create({ metadata: { action: 'execute' } });
      assert.strictEqual(context.state, 'CREATED');
      assert.strictEqual(context.startedAt, undefined);
      assert.strictEqual(context.completedAt, undefined);
      assert.strictEqual(context.durationMs, undefined);

      context.start();
      assert.strictEqual(context.state, 'ACTIVE');
      assert.ok(typeof context.startedAt === 'number');

      await new Promise((resolve) => setTimeout(resolve, 20));
      context.complete();

      assert.strictEqual(context.state, 'COMPLETED');
      assert.ok(typeof context.completedAt === 'number');
      assert.ok((context.durationMs ?? 0) >= 15);

      // Double complete() is an idempotent no-op
      const initialDuration = context.durationMs;
      const initialCompletedAt = context.completedAt;
      context.complete();
      assert.strictEqual(context.state, 'COMPLETED');
      assert.strictEqual(context.durationMs, initialDuration);
      assert.strictEqual(context.completedAt, initialCompletedAt);

      await manager.stop();
    },
  );

  await t.test(
    '7. Terminal State Protection: Cannot restart or override terminal completed/failed state',
    async () => {
      const manager = new ExecutionContextManager();

      const context = manager.create();
      context.start();
      context.fail();

      assert.strictEqual(context.state, 'FAILED');

      // Cannot start from terminal state
      assert.throws(
        () => context.start(),
        (err: Error) => err instanceof ExecutionContextStateError,
      );

      // Calling cancel() on terminal failed context aborts signal but preserves FAILED state
      context.cancel();
      assert.strictEqual(context.state, 'FAILED');
      assert.strictEqual(context.signal.aborted, true);

      await manager.stop();
    },
  );

  await t.test(
    '8. Parent to Child Cancellation Propagation: Parent abort triggers child',
    async () => {
      const manager = new ExecutionContextManager();

      const parent = manager.create({ metadata: { scope: 'parent' } });
      const child = parent.child({ childTask: 'sub1' });

      assert.strictEqual(parent.signal.aborted, false);
      assert.strictEqual(child.signal.aborted, false);

      parent.cancel();

      assert.strictEqual(parent.signal.aborted, true);
      assert.strictEqual(parent.state, 'CANCELLED');
      assert.strictEqual(child.signal.aborted, true);

      await manager.stop();
    },
  );

  await t.test('9. Child Signal Isolation: Child cancellation does NOT cancel parent', async () => {
    const manager = new ExecutionContextManager();

    const parent = manager.create({ metadata: { scope: 'parent' } });
    parent.start();
    const child = parent.child({ childTask: 'sub2' });

    child.cancel();

    assert.strictEqual(child.signal.aborted, true);
    assert.strictEqual(child.state, 'CANCELLED');
    assert.strictEqual(parent.signal.aborted, false);
    assert.strictEqual(parent.state, 'ACTIVE');

    parent.complete();
    assert.strictEqual(parent.state, 'COMPLETED');

    await manager.stop();
  });

  await t.test(
    '10. Child Metadata Inheritance & Override: Child inherits and overrides parent metadata',
    async () => {
      const manager = new ExecutionContextManager();

      const parent = manager.create({
        metadata: { traceId: '123', tenant: 'org-a', env: 'prod' },
      });
      const child = parent.child({ tenant: 'org-b', service: 'auth' });

      assert.strictEqual(child.metadata.traceId, '123');
      assert.strictEqual(child.metadata.tenant, 'org-b'); // Overridden
      assert.strictEqual(child.metadata.env, 'prod');
      assert.strictEqual(child.metadata.service, 'auth'); // New

      // Parent untouched
      assert.strictEqual(parent.metadata.tenant, 'org-a');
      assert.strictEqual(parent.metadata.service, undefined);

      // Child has unique executionId and links to parentExecutionId
      assert.strictEqual(child.parentExecutionId, parent.executionId);
      assert.notStrictEqual(child.executionId, parent.executionId);

      await manager.stop();
    },
  );

  await t.test(
    '11. AsyncLocalStorage Context Scoping: run() restores previous context deterministically',
    async () => {
      const manager = new ExecutionContextManager();

      assert.strictEqual(manager.current(), undefined);

      const ctxA = manager.create({ metadata: { name: 'A' } });
      const ctxB = manager.create({ metadata: { name: 'B' } });

      await manager.run(ctxA, async () => {
        assert.strictEqual(manager.current()?.executionId, ctxA.executionId);
        assert.strictEqual(manager.current()?.state, 'ACTIVE'); // Auto-activated on run

        await manager.run(ctxB, async () => {
          assert.strictEqual(manager.current()?.executionId, ctxB.executionId);
          assert.strictEqual(manager.current()?.state, 'ACTIVE');
        });

        // Context restored back to A
        assert.strictEqual(manager.current()?.executionId, ctxA.executionId);
      });

      // Context restored to undefined
      assert.strictEqual(manager.current(), undefined);

      ctxA.complete();
      ctxB.complete();
      await manager.stop();
    },
  );

  await t.test('12. Manager Lifecycle: Rejects creation during shutdown / after stop', async () => {
    const manager = new ExecutionContextManager();
    assert.strictEqual(manager.ready, true);

    const ctx = manager.create();
    ctx.complete();

    await manager.stop();
    assert.strictEqual(manager.ready, false);

    assert.throws(
      () => manager.create(),
      (err: Error) => err instanceof ExecutionContextStateError,
    );

    // Idempotent stop
    await manager.stop();
  });

  await t.test('13. 1,000 Concurrent Contexts & Child Contexts Execution Isolation', async () => {
    const manager = new ExecutionContextManager();

    const promises: Promise<void>[] = [];
    for (let i = 0; i < 1000; i++) {
      promises.push(
        Promise.resolve().then(async () => {
          const parent = manager.create({ metadata: { idx: i } });
          await manager.run(parent, async () => {
            const child = parent.child({ childIdx: i });
            await manager.run(child, async () => {
              assert.strictEqual(manager.current()?.executionId, child.executionId);
              child.complete();
            });
            assert.strictEqual(manager.current()?.executionId, parent.executionId);
            parent.complete();
          });
        }),
      );
    }

    await Promise.all(promises);

    const diag = manager.getDiagnostics();
    assert.strictEqual(diag.totalContexts, 2000);
    assert.strictEqual(diag.childContexts, 1000);
    assert.strictEqual(diag.completedContexts, 2000);
    assert.strictEqual(diag.activeContexts, 0);

    await manager.stop();
  });

  await t.test(
    '14. Diagnostics Security: Zero sensitive metadata or execution IDs stored',
    async () => {
      const manager = new ExecutionContextManager();

      const ctx = manager.create({
        metadata: { secretToken: 'super_secret_123', action: 'sensitive_op' },
      });
      ctx.start();
      ctx.complete();

      const diag = manager.getDiagnostics();
      const serialized = JSON.stringify(diag);

      assert.strictEqual(serialized.includes('super_secret_123'), false);
      assert.strictEqual(serialized.includes('sensitive_op'), false);
      assert.strictEqual(serialized.includes(ctx.executionId), false);

      await manager.stop();
    },
  );

  await t.test('15. ExecutionContextBuilder: Fluent API configuration', async () => {
    const manager = new ExecutionContextBuilder()
      .withDefaultMetadata({ app: 'CoreForgeApp', env: 'production' })
      .withMetadataLimits({ maxKeys: 32, maxDepth: 4 })
      .withAutoStart(true)
      .build();

    assert.strictEqual(manager.ready, true);

    const context = manager.create({ metadata: { requestId: 'req-1' } });
    assert.strictEqual(context.state, 'ACTIVE'); // Auto-started via builder option
    assert.strictEqual(context.metadata.app, 'CoreForgeApp');
    assert.strictEqual(context.metadata.env, 'production');
    assert.strictEqual(context.metadata.requestId, 'req-1');

    context.complete();
    await manager.stop();
  });

  await t.test(
    '16. Critical Architectural Boundary: Zero reverse dependencies and zero tracing imports',
    async () => {
      const pkgJsonPath = path.resolve(__dirname, '../../package.json');
      const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

      const deps = Object.keys(pkgJson.dependencies || {});
      const forbidden = [
        '@coreforge/tracing',
        '@coreforge/metrics',
        '@coreforge/logging',
        '@coreforge/cache',
        '@coreforge/events',
        '@coreforge/jobs',
        '@coreforge/locks',
        '@coreforge/rate-limit',
        '@coreforge/resilience',
        '@coreforge/runtime',
        '@coreforge/transport',
        '@coreforge/routing',
        '@coreforge/execution',
        '@coreforge/response',
      ];

      for (const f of forbidden) {
        assert.strictEqual(
          deps.includes(f),
          false,
          `Forbidden dependency detected in @coreforge/execution-context: ${f}`,
        );
      }
    },
  );
});
