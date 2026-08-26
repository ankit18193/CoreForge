import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { test } from 'node:test';

import {
  MemoryRateLimitProvider,
  RateLimitBuilder,
  RateLimitCostError,
  RateLimitKey,
  RateLimitKeyError,
  RateLimiterInstance,
  RateLimiterManager,
  RateLimitNamespace,
  RateLimitNamespaceError,
  RateLimitPolicy,
  RateLimitPolicyError,
  RateLimitStateError,
} from '../src/index';

test('CoreForge Rate Limiting & Throttling Engine (@coreforge/rate-limit)', async (t) => {
  await t.test('1. Key Validation: Rejects invalid, empty, or control-character keys', async () => {
    assert.throws(
      () => RateLimitKey.validate(''),
      (err: Error) => err instanceof RateLimitKeyError,
    );
    assert.throws(
      () => RateLimitKey.validate('   '),
      (err: Error) => err instanceof RateLimitKeyError,
    );
    assert.throws(
      () => RateLimitKey.validate('user\x00key'),
      (err: Error) => err instanceof RateLimitKeyError,
    );

    assert.strictEqual(RateLimitKey.validate('  user:123  '), 'user:123');
  });

  await t.test('2. Namespace Composition: Scopes keys with canonical prefix', async () => {
    assert.throws(
      () => RateLimitNamespace.validate(''),
      (err: Error) => err instanceof RateLimitNamespaceError,
    );
    assert.strictEqual(RateLimitNamespace.composeKey('api', 'users:123'), 'api:users:123');
  });

  await t.test('3. Policy Validation: Rejects invalid limit, windowMs, or algorithm', async () => {
    const manager = new RateLimiterManager();

    assert.throws(
      () => manager.limiter({ limit: 0, windowMs: 1000, algorithm: 'FIXED_WINDOW' }),
      (err: Error) => err instanceof RateLimitPolicyError,
    );
    assert.throws(
      () => manager.limiter({ limit: 10, windowMs: -100, algorithm: 'FIXED_WINDOW' }),
      (err: Error) => err instanceof RateLimitPolicyError,
    );
    assert.throws(
      () => manager.limiter({ limit: 10, windowMs: 1000, algorithm: 'INVALID' as never }),
      (err: Error) => err instanceof RateLimitPolicyError,
    );
    assert.throws(
      () =>
        manager.limiter({
          limit: 10,
          windowMs: 1000,
          algorithm: 'TOKEN_BUCKET',
          burstCapacity: -5,
        }),
      (err: Error) => err instanceof RateLimitPolicyError,
    );

    await manager.stop();
  });

  await t.test(
    '4. Fixed-Window Rate Limiting: Enforces limit and resets across window boundary',
    async () => {
      const manager = new RateLimiterManager();
      const policy: RateLimitPolicy = {
        limit: 3,
        windowMs: 80,
        algorithm: 'FIXED_WINDOW',
      };
      const limiter = manager.limiter(policy);

      const d1 = await limiter.consume('user:fw');
      const d2 = await limiter.consume('user:fw');
      const d3 = await limiter.consume('user:fw');
      const d4 = await limiter.consume('user:fw');

      assert.strictEqual(d1.allowed, true);
      assert.strictEqual(d1.remaining, 2);
      assert.strictEqual(d2.allowed, true);
      assert.strictEqual(d2.remaining, 1);
      assert.strictEqual(d3.allowed, true);
      assert.strictEqual(d3.remaining, 0);
      assert.strictEqual(d4.allowed, false);
      assert.strictEqual(d4.remaining, 0);
      assert.ok((d4.retryAfterMs ?? 0) > 0);

      // Wait for window to roll over
      await new Promise((resolve) => setTimeout(resolve, 95));

      const d5 = await limiter.consume('user:fw');
      assert.strictEqual(d5.allowed, true);
      assert.strictEqual(d5.remaining, 2);

      await manager.stop();
    },
  );

  await t.test('5. Sliding-Window Rate Limiting: Smooth rolling window rate limiting', async () => {
    const manager = new RateLimiterManager();
    const policy: RateLimitPolicy = {
      limit: 2,
      windowMs: 50,
      algorithm: 'SLIDING_WINDOW',
    };
    const limiter = manager.limiter(policy);

    const d1 = await limiter.consume('user:sw');
    const d2 = await limiter.consume('user:sw');
    const d3 = await limiter.consume('user:sw');

    assert.strictEqual(d1.allowed, true);
    assert.strictEqual(d2.allowed, true);
    assert.strictEqual(d3.allowed, false);

    // Wait for sliding window to expire
    await new Promise((resolve) => setTimeout(resolve, 60));

    const d4 = await limiter.consume('user:sw');
    assert.strictEqual(d4.allowed, true);

    await manager.stop();
  });

  await t.test(
    '6. Token-Bucket Rate Limiting: Consumes tokens, burst capacity, and continuous refill',
    async () => {
      const manager = new RateLimiterManager();
      const policy: RateLimitPolicy = {
        limit: 10,
        windowMs: 100, // 10 tokens per 100ms = 0.1 tokens/ms
        algorithm: 'TOKEN_BUCKET',
        burstCapacity: 15,
      };
      const limiter = manager.limiter(policy);

      // Consume burst capacity of 15
      const d1 = await limiter.consume('user:tb', { cost: 10 });
      const d2 = await limiter.consume('user:tb', { cost: 5 });
      const d3 = await limiter.consume('user:tb', { cost: 1 });

      assert.strictEqual(d1.allowed, true);
      assert.strictEqual(d2.allowed, true);
      assert.strictEqual(d3.allowed, false);
      assert.ok((d3.retryAfterMs ?? 0) > 0);

      // Wait 30ms for refill (~3 tokens)
      await new Promise((resolve) => setTimeout(resolve, 35));

      const d4 = await limiter.consume('user:tb', { cost: 2 });
      assert.strictEqual(d4.allowed, true);

      await manager.stop();
    },
  );

  await t.test(
    '7. Cost-Based Consumption: Consuming custom cost decrements proportionally',
    async () => {
      const manager = new RateLimiterManager();
      const limiter = manager.limiter({
        limit: 10,
        windowMs: 1000,
        algorithm: 'FIXED_WINDOW',
      });

      const d1 = await limiter.consume('cost:test', { cost: 6 });
      assert.strictEqual(d1.allowed, true);
      assert.strictEqual(d1.remaining, 4);

      const d2 = await limiter.consume('cost:test', { cost: 5 }); // 6 + 5 > 10
      assert.strictEqual(d2.allowed, false);

      const d3 = await limiter.consume('cost:test', { cost: 4 }); // 6 + 4 <= 10
      assert.strictEqual(d3.allowed, true);
      assert.strictEqual(d3.remaining, 0);

      await manager.stop();
    },
  );

  await t.test('8. Cost Validation: Rejects non-positive or invalid cost', async () => {
    const manager = new RateLimiterManager();
    const limiter = manager.limiter({
      limit: 5,
      windowMs: 1000,
      algorithm: 'FIXED_WINDOW',
    });

    await assert.rejects(
      async () => limiter.consume('test', { cost: 0 }),
      (err: Error) => err instanceof RateLimitCostError,
    );
    await assert.rejects(
      async () => limiter.consume('test', { cost: -2 }),
      (err: Error) => err instanceof RateLimitCostError,
    );

    await manager.stop();
  });

  await t.test('9. Dry-Run Check: Does not consume tokens or counters', async () => {
    const manager = new RateLimiterManager();
    const limiter = manager.limiter({
      limit: 2,
      windowMs: 1000,
      algorithm: 'FIXED_WINDOW',
    });

    const c1 = await limiter.check('check:test');
    const c2 = await limiter.check('check:test');
    assert.strictEqual(c1.allowed, true);
    assert.strictEqual(c2.allowed, true);
    assert.strictEqual(c1.remaining, 1);

    // Actual consumption
    const d1 = await limiter.consume('check:test');
    const d2 = await limiter.consume('check:test');
    const d3 = await limiter.consume('check:test');

    assert.strictEqual(d1.allowed, true);
    assert.strictEqual(d2.allowed, true);
    assert.strictEqual(d3.allowed, false);

    await manager.stop();
  });

  await t.test('10. Reset: Clears counters for a specific key', async () => {
    const manager = new RateLimiterManager();
    const limiter = manager.limiter({
      limit: 1,
      windowMs: 1000,
      algorithm: 'FIXED_WINDOW',
    });

    await limiter.consume('reset:key');
    const reject = await limiter.consume('reset:key');
    assert.strictEqual(reject.allowed, false);

    await limiter.reset('reset:key');

    const allow = await limiter.consume('reset:key');
    assert.strictEqual(allow.allowed, true);

    await manager.stop();
  });

  await t.test(
    '11. Namespace Isolation & Immutability: Scoped limiters do not collide',
    async () => {
      const manager = new RateLimiterManager();
      const baseLimiter = manager.limiter({
        limit: 1,
        windowMs: 1000,
        algorithm: 'FIXED_WINDOW',
      });

      const tenantA = baseLimiter.namespace('tenant-a');
      const tenantB = baseLimiter.namespace('tenant-b');

      const dA = await tenantA.consume('resource:1');
      const dB = await tenantB.consume('resource:1');
      const dBase = await baseLimiter.consume('resource:1');

      assert.strictEqual(dA.allowed, true);
      assert.strictEqual(dB.allowed, true);
      assert.strictEqual(dBase.allowed, true);

      assert.strictEqual((baseLimiter as RateLimiterInstance).namespacePrefix, undefined);
      assert.strictEqual((tenantA as RateLimiterInstance).namespacePrefix, 'tenant-a');
      assert.strictEqual((tenantB as RateLimiterInstance).namespacePrefix, 'tenant-b');

      await manager.stop();
    },
  );

  await t.test(
    '12. Lifecycle Transitions & State Enforcement: Rejects operations after STOPPED',
    async () => {
      const manager = new RateLimiterManager({ autoStart: false });
      assert.strictEqual(manager.state, 'CREATED');
      assert.strictEqual(manager.ready, false);

      const limiter = manager.limiter({
        limit: 5,
        windowMs: 1000,
        algorithm: 'FIXED_WINDOW',
      });

      await assert.rejects(
        async () => limiter.consume('test'),
        (err: Error) => err instanceof RateLimitStateError,
      );

      await manager.start();
      assert.strictEqual(manager.state, 'READY');
      assert.strictEqual(manager.ready, true);

      // Idempotent start
      await manager.start();
      assert.strictEqual(manager.state, 'READY');

      const d = await limiter.consume('test');
      assert.strictEqual(d.allowed, true);

      await manager.stop();
      assert.strictEqual(manager.state, 'STOPPED');
      assert.strictEqual(manager.ready, false);

      // Idempotent stop
      await manager.stop();
      assert.strictEqual(manager.state, 'STOPPED');

      await assert.rejects(
        async () => limiter.consume('test'),
        (err: Error) => err instanceof RateLimitStateError,
      );
    },
  );

  await t.test(
    '13. Diagnostics Tracking & Security: Records metrics without storing raw keys',
    async () => {
      const manager = new RateLimiterManager();
      const limiter = manager.limiter({
        limit: 2,
        windowMs: 1000,
        algorithm: 'FIXED_WINDOW',
      });

      await limiter.consume('secret:auth:token:123', { cost: 1 });
      await limiter.consume('secret:auth:token:123', { cost: 1 });
      await limiter.consume('secret:auth:token:123', { cost: 1 }); // rejected

      const diag = manager.getDiagnostics();
      assert.strictEqual(diag.totalChecks, 3);
      assert.strictEqual(diag.allowedRequests, 2);
      assert.strictEqual(diag.rejectedRequests, 1);
      assert.strictEqual(diag.totalConsumedCost, 2);
      assert.strictEqual(diag.throttledRequests, 1);
      assert.ok(diag.averageLatencyMs >= 0);

      const serialized = JSON.stringify(diag);
      assert.strictEqual(serialized.includes('secret:auth:token:123'), false);

      await manager.stop();
    },
  );

  await t.test('14. 1,000 High-Concurrency Requests: Processes large volume safely', async () => {
    const manager = new RateLimiterManager();
    const limiter = manager.limiter({
      limit: 500,
      windowMs: 1000,
      algorithm: 'FIXED_WINDOW',
    });

    const promises: Promise<unknown>[] = [];
    for (let i = 0; i < 1000; i++) {
      promises.push(limiter.consume('concurrency:key'));
    }

    const results = await Promise.all(promises);
    const allowed = results.filter((r) => (r as { allowed: boolean }).allowed);
    const rejected = results.filter((r) => !(r as { allowed: boolean }).allowed);

    assert.strictEqual(allowed.length, 500);
    assert.strictEqual(rejected.length, 500);

    await manager.stop();
  });

  await t.test(
    '15. Multiple Manager Isolation: Separate RateLimiterManager instances do not cross-talk',
    async () => {
      const managerA = new RateLimiterManager();
      const managerB = new RateLimiterManager();

      const limiterA = managerA.limiter({ limit: 1, windowMs: 1000, algorithm: 'FIXED_WINDOW' });
      const limiterB = managerB.limiter({ limit: 1, windowMs: 1000, algorithm: 'FIXED_WINDOW' });

      const dA = await limiterA.consume('same-key');
      const dB = await limiterB.consume('same-key');

      assert.strictEqual(dA.allowed, true);
      assert.strictEqual(dB.allowed, true);

      await managerA.stop();
      await managerB.stop();
    },
  );

  await t.test('16. RateLimitBuilder Fluent API: Builds custom configured manager', async () => {
    const customProvider = new MemoryRateLimitProvider();
    const manager = new RateLimitBuilder()
      .provider(customProvider)
      .defaultCost(2)
      .autoStart(false)
      .build();

    assert.strictEqual(manager.provider, customProvider);
    assert.strictEqual(manager.ready, false);

    await manager.start();
    assert.strictEqual(manager.ready, true);

    const limiter = manager.limiter({ limit: 5, windowMs: 1000, algorithm: 'FIXED_WINDOW' });
    const d = await limiter.consume('test-default-cost'); // consumes defaultCost = 2
    assert.strictEqual(d.consumed, 2);

    await manager.stop();
  });

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
      ];

      for (const f of forbidden) {
        assert.strictEqual(
          deps.includes(f),
          false,
          `Forbidden dependency detected in @coreforge/rate-limit: ${f}`,
        );
      }
    },
  );
});
