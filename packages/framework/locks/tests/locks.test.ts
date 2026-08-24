import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { test } from 'node:test';

import {
  LockAcquisitionError,
  LockAcquisitionTimeoutError,
  LockBuilder,
  LockCancellationError,
  LockConfigurationError,
  LockKeyError,
  LockLease,
  LockLeaseValidator,
  LockManager,
  LockNamespace,
  LockNamespaceError,
  LockOwnershipError,
  LockRenewalError,
  LockStateError,
  MemoryLockProvider,
} from '../src/index';

test('CoreForge Distributed Coordination & Locking Engine (@coreforge/locks)', async (t) => {
  await t.test(
    '1. Lock Key Validation: Rejects invalid, empty, or control-character keys',
    async () => {
      const manager = new LockManager();

      assert.throws(
        () => manager.lock(''),
        (err: Error) => err instanceof LockKeyError,
      );
      assert.throws(
        () => manager.lock('   '),
        (err: Error) => err instanceof LockKeyError,
      );
      assert.throws(
        () => manager.lock('key\x00withControl'),
        (err: Error) => err instanceof LockKeyError,
      );

      await manager.stop();
    },
  );

  await t.test('2. Namespace Composition: Scopes keys with canonical prefix', async () => {
    const manager = new LockManager();
    const lock = manager.lock('order:123').namespace('payments');
    assert.ok(lock);

    assert.throws(
      () => LockNamespace.validate(''),
      (err: Error) => err instanceof LockNamespaceError,
    );
    assert.strictEqual(LockNamespace.composeKey('billing', 'user:456'), 'billing:user:456');

    await manager.stop();
  });

  await t.test(
    '3. Successful Acquisition: Acquires lock lease with valid TTL and unique token',
    async () => {
      const manager = new LockManager();
      const lock = manager.lock('resource:1');

      const lease = await lock.acquire({ ttlMs: 1000 });
      assert.strictEqual(lease.key, 'resource:1');
      assert.ok(lease.token);
      assert.ok(lease.acquiredAt > 0);
      assert.strictEqual(lease.expiresAt, lease.acquiredAt + 1000);

      const isLocked = await lock.isLocked();
      assert.strictEqual(isLocked, true);

      await lock.release(lease);
      await manager.stop();
    },
  );

  await t.test(
    '4. Duplicate Acquisition: Rejects concurrent acquisition when lock is actively held',
    async () => {
      const manager = new LockManager();
      const lock = manager.lock('resource:2');

      const lease1 = await lock.acquire({ ttlMs: 1000 });

      await assert.rejects(
        async () => lock.acquire({ ttlMs: 1000 }),
        (err: Error) => err instanceof LockAcquisitionError,
      );

      await lock.release(lease1);
      await manager.stop();
    },
  );

  await t.test(
    '5. Concurrent Acquisition Race: Exactly 1 winner among parallel acquisition attempts',
    async () => {
      const manager = new LockManager();
      const lock = manager.lock('resource:race');

      const results = await Promise.allSettled([
        lock.acquire({ ttlMs: 500 }),
        lock.acquire({ ttlMs: 500 }),
        lock.acquire({ ttlMs: 500 }),
        lock.acquire({ ttlMs: 500 }),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      assert.strictEqual(fulfilled.length, 1);
      assert.strictEqual(rejected.length, 3);

      const winnerLease = (fulfilled[0] as PromiseFulfilledResult<LockLease>).value;
      await lock.release(winnerLease);
      await manager.stop();
    },
  );

  await t.test(
    '6. Ownership Token Validation: Only owner with valid token may release lock',
    async () => {
      const manager = new LockManager();
      const lock = manager.lock('resource:owner');

      const lease = await lock.acquire({ ttlMs: 1000 });

      const fakeLease: LockLease = {
        key: 'resource:owner',
        token: 'imposter-token',
        acquiredAt: lease.acquiredAt,
        expiresAt: lease.expiresAt,
      };

      const releasedWithFake = await lock.release(fakeLease);
      assert.strictEqual(releasedWithFake, false);

      // Original lock is still held
      assert.strictEqual(await lock.isLocked(), true);

      // Release with legitimate owner token
      const releasedWithReal = await lock.release(lease);
      assert.strictEqual(releasedWithReal, true);
      assert.strictEqual(await lock.isLocked(), false);

      await manager.stop();
    },
  );

  await t.test(
    '7. Lease Expiration: Lock is automatically released after TTL expires',
    async () => {
      const manager = new LockManager();
      const lock = manager.lock('resource:expire');

      await lock.acquire({ ttlMs: 30 });
      assert.strictEqual(await lock.isLocked(), true);

      await new Promise((resolve) => setTimeout(resolve, 45));
      assert.strictEqual(await lock.isLocked(), false);

      await manager.stop();
    },
  );

  await t.test(
    '8. Expired Lock Reclamation: Can acquire expired lock without explicit release',
    async () => {
      const manager = new LockManager();
      const lock = manager.lock('resource:reclaim');

      const lease1 = await lock.acquire({ ttlMs: 25 });
      await new Promise((resolve) => setTimeout(resolve, 40));

      const lease2 = await lock.acquire({ ttlMs: 500 });
      assert.notStrictEqual(lease1.token, lease2.token);
      assert.strictEqual(await lock.isLocked(), true);

      await lock.release(lease2);
      await manager.stop();
    },
  );

  await t.test('9. Lease Renewal: Extends expiration timestamp for active lease', async () => {
    const manager = new LockManager();
    const lock = manager.lock('resource:renew');

    const lease = await lock.acquire({ ttlMs: 100 });
    const renewed = await lock.renew(lease, 500);

    assert.strictEqual(renewed.token, lease.token);
    assert.ok(renewed.expiresAt > lease.expiresAt);

    await lock.release(renewed);
    await manager.stop();
  });

  await t.test(
    '10. Renewal Rejection: Rejects renewal after expiration or with invalid token',
    async () => {
      const manager = new LockManager();
      const lock = manager.lock('resource:renew-fail');

      const lease = await lock.acquire({ ttlMs: 25 });
      await new Promise((resolve) => setTimeout(resolve, 40));

      // Expired renewal rejected
      await assert.rejects(
        async () => lock.renew(lease, 500),
        (err: Error) => err instanceof LockRenewalError,
      );

      // Wrong token renewal rejected
      const activeLease = await lock.acquire({ ttlMs: 500 });
      const fakeLease: LockLease = { ...activeLease, token: 'fake-token' };

      await assert.rejects(
        async () => lock.renew(fakeLease, 500),
        (err: Error) => err instanceof LockRenewalError,
      );

      await lock.release(activeLease);
      await manager.stop();
    },
  );

  await t.test(
    '11. Acquisition Timeout: Throws LockAcquisitionTimeoutError when timeoutMs elapses',
    async () => {
      const manager = new LockManager();
      const lock = manager.lock('resource:timeout');

      const lease = await lock.acquire({ ttlMs: 500 });

      await assert.rejects(
        async () => lock.acquire({ ttlMs: 100, timeoutMs: 30 }),
        (err: Error) => err instanceof LockAcquisitionTimeoutError,
      );

      await lock.release(lease);
      await manager.stop();
    },
  );

  await t.test(
    '12. Waiting Acquisition: Succeeds when active lock is released during wait window',
    async () => {
      const manager = new LockManager();
      const lock = manager.lock('resource:wait-success');

      const lease1 = await lock.acquire({ ttlMs: 1000 });

      // Release after 30ms
      setTimeout(async () => {
        await lock.release(lease1);
      }, 30);

      const lease2 = await lock.acquire({ ttlMs: 500, timeoutMs: 200 });
      assert.ok(lease2);
      assert.strictEqual(lease2.key, 'resource:wait-success');

      await lock.release(lease2);
      await manager.stop();
    },
  );

  await t.test('13. Acquisition Cancellation: AbortSignal cancels waiter immediately', async () => {
    const manager = new LockManager();
    const lock = manager.lock('resource:abort');

    const lease = await lock.acquire({ ttlMs: 1000 });

    const controller = new AbortController();
    setTimeout(() => {
      controller.abort();
    }, 20);

    await assert.rejects(
      async () =>
        lock.acquire({
          ttlMs: 500,
          timeoutMs: 500,
          signal: controller.signal,
        }),
      (err: Error) => err instanceof LockCancellationError,
    );

    await lock.release(lease);
    await manager.stop();
  });

  await t.test(
    '14. Shutdown Evacuation: Stopping manager wakes all pending acquisition waiters',
    async () => {
      const manager = new LockManager();
      const lock = manager.lock('resource:evacuate');

      const lease = await lock.acquire({ ttlMs: 2000 });

      const waitPromise = lock.acquire({ ttlMs: 500, timeoutMs: 2000 });

      setTimeout(async () => {
        await manager.stop();
      }, 20);

      await assert.rejects(
        async () => waitPromise,
        (err: Error) => err instanceof LockStateError,
      );

      try {
        await lock.release(lease);
      } catch {
        // expected reject on stopped manager
      }
    },
  );

  await t.test('15. Namespace Isolation: Keys in different namespaces do not collide', async () => {
    const manager = new LockManager();
    const lockA = manager.lock('shared-key').namespace('tenant-a');
    const lockB = manager.lock('shared-key').namespace('tenant-b');

    const leaseA = await lockA.acquire({ ttlMs: 500 });
    const leaseB = await lockB.acquire({ ttlMs: 500 });

    assert.ok(leaseA);
    assert.ok(leaseB);
    assert.notStrictEqual(leaseA.token, leaseB.token);

    await lockA.release(leaseA);
    await lockB.release(leaseB);
    await manager.stop();
  });

  await t.test('16. Lifecycle Transitions: CREATED -> READY -> STOPPING -> STOPPED', async () => {
    const manager = new LockManager({ autoStart: false });
    assert.strictEqual(manager.state, 'CREATED');
    assert.strictEqual(manager.ready, false);

    await manager.start();
    assert.strictEqual(manager.state, 'READY');
    assert.strictEqual(manager.ready, true);

    // Idempotent start
    await manager.start();
    assert.strictEqual(manager.state, 'READY');

    await manager.stop();
    assert.strictEqual(manager.state, 'STOPPED');
    assert.strictEqual(manager.ready, false);

    // Idempotent stop
    await manager.stop();
    assert.strictEqual(manager.state, 'STOPPED');
  });

  await t.test(
    '17. Lifecycle Enforcement: Rejects operations before READY and after STOPPED',
    async () => {
      const unstarted = new LockManager({ autoStart: false });
      const unstartedLock = unstarted.lock('k1');

      await assert.rejects(
        async () => unstartedLock.acquire({ ttlMs: 100 }),
        (err: Error) => err instanceof LockStateError,
      );

      const stopped = new LockManager();
      const stoppedLock = stopped.lock('k2');
      await stopped.stop();

      await assert.rejects(
        async () => stoppedLock.acquire({ ttlMs: 100 }),
        (err: Error) => err instanceof LockStateError,
      );
    },
  );

  await t.test(
    '18. Diagnostics Tracking: Records counts, renewals, releases, and latency metrics',
    async () => {
      const manager = new LockManager();
      const lock = manager.lock('metric:test');

      const lease = await lock.acquire({ ttlMs: 100 });
      const renewed = await lock.renew(lease, 200);
      await lock.release(renewed);

      const diag = manager.getDiagnostics();
      assert.strictEqual(diag.totalAcquireAttempts, 1);
      assert.strictEqual(diag.successfulAcquisitions, 1);
      assert.strictEqual(diag.renewals, 1);
      assert.strictEqual(diag.releases, 1);
      assert.ok(diag.averageAcquireLatencyMs >= 0);

      await manager.stop();
    },
  );

  await t.test(
    '19. Diagnostics Security: Contains no lock keys, tokens, or sensitive data',
    async () => {
      const manager = new LockManager();
      const lock = manager.lock('secret:sensitive:key');

      const lease = await lock.acquire({ ttlMs: 100 });
      await lock.release(lease);

      const diag = manager.getDiagnostics();
      const serializedDiag = JSON.stringify(diag);

      assert.strictEqual(serializedDiag.includes('secret:sensitive:key'), false);
      assert.strictEqual(serializedDiag.includes(lease.token), false);

      await manager.stop();
    },
  );

  await t.test(
    '20. 1,000 High-Concurrency Sequential Locks: Processes high volume safely',
    async () => {
      const manager = new LockManager();

      for (let i = 0; i < 1000; i++) {
        const lock = manager.lock(`key:${i}`);
        const lease = await lock.acquire({ ttlMs: 50 });
        await lock.release(lease);
      }

      const diag = manager.getDiagnostics();
      assert.strictEqual(diag.totalAcquireAttempts, 1000);
      assert.strictEqual(diag.successfulAcquisitions, 1000);
      assert.strictEqual(diag.releases, 1000);

      await manager.stop();
    },
  );

  await t.test(
    '21. Multiple Instance Isolation: Separate LockManager instances have zero cross-talk',
    async () => {
      const managerA = new LockManager();
      const managerB = new LockManager();

      const lockA = managerA.lock('same-key');
      const lockB = managerB.lock('same-key');

      const leaseA = await lockA.acquire({ ttlMs: 500 });
      const leaseB = await lockB.acquire({ ttlMs: 500 });

      assert.ok(leaseA);
      assert.ok(leaseB);
      assert.notStrictEqual(leaseA.token, leaseB.token);

      await lockA.release(leaseA);
      await lockB.release(leaseB);

      await managerA.stop();
      await managerB.stop();
    },
  );

  await t.test('22. LockBuilder Fluent API: Builds custom configured lock manager', async () => {
    const customProvider = new MemoryLockProvider();
    const manager = new LockBuilder()
      .provider(customProvider)
      .defaultTtlMs(3000)
      .defaultTimeoutMs(1500)
      .autoStart(false)
      .build();

    assert.strictEqual(manager.provider, customProvider);
    assert.strictEqual(manager.ready, false);

    await manager.start();
    assert.strictEqual(manager.ready, true);
    await manager.stop();
  });

  await t.test(
    '23. Lease Validation & TTL Requirements: Rejects non-positive or invalid TTL',
    async () => {
      assert.throws(
        () => LockLeaseValidator.validateTtl(0),
        (err: Error) => err instanceof LockConfigurationError,
      );
      assert.throws(
        () => LockLeaseValidator.validateTtl(-100),
        (err: Error) => err instanceof LockConfigurationError,
      );
      assert.throws(
        () => LockLeaseValidator.validateLease(null),
        (err: Error) => err instanceof LockOwnershipError,
      );
      assert.throws(
        () => LockLeaseValidator.validateLease({ key: '' }),
        (err: Error) => err instanceof LockOwnershipError,
      );
    },
  );

  await t.test(
    '24. Release Key Mismatch: Releasing lease on wrong lock instance throws LockOwnershipError',
    async () => {
      const manager = new LockManager();
      const lock1 = manager.lock('key:1');
      const lock2 = manager.lock('key:2');

      const lease1 = await lock1.acquire({ ttlMs: 500 });

      await assert.rejects(
        async () => lock2.release(lease1),
        (err: Error) => err instanceof LockOwnershipError,
      );

      await lock1.release(lease1);
      await manager.stop();
    },
  );

  await t.test(
    '25. Critical Architectural Boundary: Zero higher-layer or external broker dependencies',
    async () => {
      const pkgJsonPath = path.resolve(__dirname, '../../package.json');
      const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

      const deps = Object.keys(pkgJson.dependencies || {});
      const forbidden = [
        '@coreforge/cache',
        '@coreforge/events',
        '@coreforge/jobs',
        '@coreforge/logging',
        '@coreforge/config',
        '@coreforge/runtime',
        '@coreforge/transport',
        '@coreforge/routing',
        '@coreforge/execution',
        '@coreforge/response',
        'redis',
        'ioredis',
        'zookeeper',
        'etcd3',
      ];

      for (const f of forbidden) {
        assert.strictEqual(
          deps.includes(f),
          false,
          `Forbidden dependency detected in @coreforge/locks: ${f}`,
        );
      }
    },
  );
});
