import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { test } from 'node:test';

import {
  CacheBuilder,
  CacheExpirationError,
  CacheKeyError,
  CacheManager,
  CacheNamespaceError,
  CacheProvider,
  CacheProviderError,
  CacheSerializer,
  CacheStateError,
  MemoryCacheProvider,
  SnapshotSerializer,
} from '../src/index';

test('CoreForge Caching & Cache Abstraction Engine (@coreforge/cache)', async (t) => {
  await t.test('1. Cache Creation: Creates ready CacheManager with defaults', async () => {
    const cache = new CacheManager();
    assert.strictEqual(cache.state, 'READY');
    assert.strictEqual(cache.failurePolicy, 'FAIL_OPEN');
    assert.strictEqual(cache.defaultTtlMs, undefined);
  });

  await t.test('2. Set & Get: Stores and retrieves primitive values and objects', async () => {
    const cache = new CacheManager();
    await cache.set('str', 'hello world');
    await cache.set('num', 42);
    await cache.set('bool', true);
    await cache.set('obj', { a: 1, b: 'two' });
    await cache.set('arr', [1, 2, 3]);

    assert.strictEqual(await cache.get<string>('str'), 'hello world');
    assert.strictEqual(await cache.get<number>('num'), 42);
    assert.strictEqual(await cache.get<boolean>('bool'), true);
    assert.deepStrictEqual(await cache.get<Record<string, unknown>>('obj'), { a: 1, b: 'two' });
    assert.deepStrictEqual(await cache.get<number[]>('arr'), [1, 2, 3]);
  });

  await t.test('3. Cache Miss: Returns undefined for non-existent keys', async () => {
    const cache = new CacheManager();
    const result = await cache.get('non-existent-key');
    assert.strictEqual(result, undefined);
  });

  await t.test(
    '4. Delete: Removes entry and returns true if existed, false otherwise',
    async () => {
      const cache = new CacheManager();
      await cache.set('k1', 'v1');

      const deleted = await cache.delete('k1');
      assert.strictEqual(deleted, true);
      assert.strictEqual(await cache.get('k1'), undefined);

      const deletedAgain = await cache.delete('k1');
      assert.strictEqual(deletedAgain, false);
    },
  );

  await t.test('5. Has: Accurately reports presence of unexpired keys', async () => {
    const cache = new CacheManager();
    await cache.set('k1', 'v1');

    assert.strictEqual(await cache.has('k1'), true);
    assert.strictEqual(await cache.has('missing'), false);
  });

  await t.test('6. Clear: Removes all cached entries', async () => {
    const cache = new CacheManager();
    await cache.set('k1', 'v1');
    await cache.set('k2', 'v2');
    await cache.set('k3', 'v3');

    await cache.clear();
    assert.strictEqual(await cache.get('k1'), undefined);
    assert.strictEqual(await cache.get('k2'), undefined);
    assert.strictEqual(await cache.get('k3'), undefined);
  });

  await t.test('7. TTL Expiration: Expired entries behave as cache misses', async () => {
    const cache = new CacheManager();
    await cache.set('temp', 'value', { ttlMs: 30 });

    assert.strictEqual(await cache.get('temp'), 'value');
    await new Promise((resolve) => setTimeout(resolve, 45));
    assert.strictEqual(await cache.get('temp'), undefined);
    assert.strictEqual(await cache.has('temp'), false);
  });

  await t.test('8. Expired Values: Never returned after expiration timestamp', async () => {
    const provider = new MemoryCacheProvider();
    const cache = new CacheBuilder().setProvider(provider).build();

    await cache.set('expire-soon', { data: 123 }, { ttlMs: 20 });
    await new Promise((resolve) => setTimeout(resolve, 35));

    const result = await cache.get('expire-soon');
    assert.strictEqual(result, undefined);
    assert.strictEqual(await cache.has('expire-soon'), false);
  });

  await t.test('9. Default TTL: Applied to set operations when options omit ttlMs', async () => {
    const cache = new CacheBuilder().setDefaultTtlMs(30).build();
    await cache.set('default-ttl-key', 'data');

    assert.strictEqual(await cache.get('default-ttl-key'), 'data');
    await new Promise((resolve) => setTimeout(resolve, 45));
    assert.strictEqual(await cache.get('default-ttl-key'), undefined);
  });

  await t.test(
    '10. Custom TTL Override: Per-operation TTL overrides manager default TTL',
    async () => {
      const cache = new CacheBuilder().setDefaultTtlMs(1000).build();
      await cache.set('short-lived', 'data', { ttlMs: 25 });

      assert.strictEqual(await cache.get('short-lived'), 'data');
      await new Promise((resolve) => setTimeout(resolve, 40));
      assert.strictEqual(await cache.get('short-lived'), undefined);
    },
  );

  await t.test(
    '11. Invalid TTL Rejection: <= 0 and non-finite TTLs throw CacheExpirationError',
    async () => {
      const cache = new CacheManager();
      await assert.rejects(
        async () => cache.set('k', 'v', { ttlMs: 0 }),
        (err: Error) => err instanceof CacheExpirationError,
      );
      await assert.rejects(
        async () => cache.set('k', 'v', { ttlMs: -100 }),
        (err: Error) => err instanceof CacheExpirationError,
      );
      await assert.rejects(
        async () => cache.set('k', 'v', { ttlMs: NaN }),
        (err: Error) => err instanceof CacheExpirationError,
      );
    },
  );

  await t.test(
    '12. Key Validation: Rejects empty, whitespace-only, and control character keys',
    async () => {
      const cache = new CacheManager();
      await assert.rejects(
        async () => cache.get(''),
        (err: Error) => err instanceof CacheKeyError,
      );
      await assert.rejects(
        async () => cache.set('   ', 'val'),
        (err: Error) => err instanceof CacheKeyError,
      );
      await assert.rejects(
        async () => cache.delete('bad\x00key'),
        (err: Error) => err instanceof CacheKeyError,
      );
    },
  );

  await t.test('13. Namespace Isolation: Namespaces prevent key collision', async () => {
    const cache = new CacheManager();
    const userCache = cache.namespace('users');
    const productCache = cache.namespace('products');

    await userCache.set('100', { name: 'Alice' });
    await productCache.set('100', { title: 'Laptop' });

    assert.deepStrictEqual(await userCache.get('100'), { name: 'Alice' });
    assert.deepStrictEqual(await productCache.get('100'), { title: 'Laptop' });

    // Internal canonical keys
    assert.deepStrictEqual(await cache.get('users:100'), { name: 'Alice' });
    assert.deepStrictEqual(await cache.get('products:100'), { title: 'Laptop' });

    // Invalid namespace rejection
    assert.throws(
      () => cache.namespace(''),
      (err: Error) => err instanceof CacheNamespaceError,
    );
    assert.throws(
      () => cache.namespace('   '),
      (err: Error) => err instanceof CacheNamespaceError,
    );
  });

  await t.test('14. Nested Namespaces: Compose prefixes deterministically', async () => {
    const cache = new CacheManager();
    const sub = cache.namespace('org').namespace('dept');

    await sub.set('finance', { budget: 50000 });
    assert.deepStrictEqual(await sub.get('finance'), { budget: 50000 });
    assert.deepStrictEqual(await cache.get('org:dept:finance'), { budget: 50000 });
  });

  await t.test(
    '15. Value Snapshotting (set): Mutating input object does not mutate cache',
    async () => {
      const cache = new CacheManager();
      const original = { count: 1, nested: { value: 'initial' } };
      await cache.set('snapshot-test', original);

      // Mutate original
      original.count = 999;
      original.nested.value = 'mutated';

      const cached = await cache.get<typeof original>('snapshot-test');
      assert.strictEqual(cached?.count, 1);
      assert.strictEqual(cached?.nested.value, 'initial');
    },
  );

  await t.test(
    '16. Mutation Isolation (get): Mutating returned object does not mutate cache',
    async () => {
      const cache = new CacheManager();
      await cache.set('isolation-test', { items: ['A', 'B'] });

      const retrieved1 = await cache.get<{ items: string[] }>('isolation-test');
      assert.ok(retrieved1);
      retrieved1.items.push('C'); // Mutate returned value

      const retrieved2 = await cache.get<{ items: string[] }>('isolation-test');
      assert.deepStrictEqual(retrieved2?.items, ['A', 'B']);
    },
  );

  await t.test(
    '17. Circular Reference Handling: Replaces cycles with [Circular] safely',
    async () => {
      const cache = new CacheManager();
      const cyclicObj: Record<string, unknown> = { name: 'cycle' };
      cyclicObj.self = cyclicObj;

      await cache.set('cyclic', cyclicObj);
      const result = await cache.get<Record<string, unknown>>('cyclic');
      assert.strictEqual(result?.name, 'cycle');
      assert.strictEqual(result?.self, '[Circular]');
    },
  );

  await t.test('18. Custom Serializer: Can use custom serialization mechanism', async () => {
    const customSerializer: CacheSerializer<string> = {
      serialize: (val) => `CUSTOM:${val}`,
      deserialize: (raw) =>
        (typeof raw === 'string' && raw.startsWith('CUSTOM:') ? raw.slice(7) : raw) as string,
    };

    const cache = new CacheBuilder().setSerializer(customSerializer).build();
    await cache.set('custom-key', 'my-data');

    assert.strictEqual(await cache.get('custom-key'), 'my-data');
  });

  await t.test(
    '19. Provider Failure - FAIL_OPEN: Returns undefined on get and false on delete',
    async () => {
      const failingProvider: CacheProvider = {
        get: async () => {
          throw new Error('Database down');
        },
        set: async () => {
          throw new Error('Disk full');
        },
        delete: async () => {
          throw new Error('IO error');
        },
        has: async () => {
          throw new Error('IO error');
        },
        clear: async () => {
          throw new Error('IO error');
        },
      };

      const cache = new CacheBuilder()
        .setProvider(failingProvider)
        .setFailurePolicy('FAIL_OPEN')
        .build();

      assert.strictEqual(await cache.get('k'), undefined);
      assert.strictEqual(await cache.delete('k'), false);
      assert.strictEqual(await cache.has('k'), false);
      await assert.doesNotReject(async () => cache.set('k', 'v'));
      await assert.doesNotReject(async () => cache.clear());
    },
  );

  await t.test(
    '20. Provider Failure - FAIL_CLOSED: Throws CacheProviderError on failure',
    async () => {
      const failingProvider: CacheProvider = {
        get: async () => {
          throw new Error('DB connection refused');
        },
        set: async () => {
          throw new Error('DB connection refused');
        },
        delete: async () => {
          throw new Error('DB connection refused');
        },
        has: async () => {
          throw new Error('DB connection refused');
        },
        clear: async () => {
          throw new Error('DB connection refused');
        },
      };

      const cache = new CacheBuilder()
        .setProvider(failingProvider)
        .setFailurePolicy('FAIL_CLOSED')
        .build();

      await assert.rejects(
        async () => cache.get('k'),
        (err: Error) => err instanceof CacheProviderError,
      );
      await assert.rejects(
        async () => cache.set('k', 'v'),
        (err: Error) => err instanceof CacheProviderError,
      );
      await assert.rejects(
        async () => cache.delete('k'),
        (err: Error) => err instanceof CacheProviderError,
      );
      await assert.rejects(
        async () => cache.has('k'),
        (err: Error) => err instanceof CacheProviderError,
      );
      await assert.rejects(
        async () => cache.clear(),
        (err: Error) => err instanceof CacheProviderError,
      );
    },
  );

  await t.test(
    '21. getOrSet: Executes factory on cache miss and returns cached value on hit',
    async () => {
      const cache = new CacheManager();
      let invocations = 0;

      const val1 = await cache.getOrSet('computed', async () => {
        invocations++;
        return { answer: 42 };
      });

      assert.deepStrictEqual(val1, { answer: 42 });
      assert.strictEqual(invocations, 1);

      // Second call - should hit cache
      const val2 = await cache.getOrSet('computed', async () => {
        invocations++;
        return { answer: 999 };
      });

      assert.deepStrictEqual(val2, { answer: 42 });
      assert.strictEqual(invocations, 1);
    },
  );

  await t.test(
    '22. getOrSet Stampede Prevention: Concurrent requests execute factory exactly once',
    async () => {
      const cache = new CacheManager();
      let factoryExecutions = 0;

      const results = await Promise.all([
        cache.getOrSet('stampede-key', async () => {
          factoryExecutions++;
          await new Promise((resolve) => setTimeout(resolve, 30));
          return 'computed-once';
        }),
        cache.getOrSet('stampede-key', async () => {
          factoryExecutions++;
          await new Promise((resolve) => setTimeout(resolve, 30));
          return 'computed-once';
        }),
        cache.getOrSet('stampede-key', async () => {
          factoryExecutions++;
          await new Promise((resolve) => setTimeout(resolve, 30));
          return 'computed-once';
        }),
        cache.getOrSet('stampede-key', async () => {
          factoryExecutions++;
          await new Promise((resolve) => setTimeout(resolve, 30));
          return 'computed-once';
        }),
      ]);

      assert.strictEqual(factoryExecutions, 1);
      assert.deepStrictEqual(results, [
        'computed-once',
        'computed-once',
        'computed-once',
        'computed-once',
      ]);
    },
  );

  await t.test(
    '23. Different Keys Execute Factories Independently: Distinct keys do not block each other',
    async () => {
      const cache = new CacheManager();
      let keyAExecs = 0;
      let keyBExecs = 0;

      const [resA, resB] = await Promise.all([
        cache.getOrSet('key-A', async () => {
          keyAExecs++;
          await new Promise((resolve) => setTimeout(resolve, 20));
          return 'result-A';
        }),
        cache.getOrSet('key-B', async () => {
          keyBExecs++;
          await new Promise((resolve) => setTimeout(resolve, 20));
          return 'result-B';
        }),
      ]);

      assert.strictEqual(resA, 'result-A');
      assert.strictEqual(resB, 'result-B');
      assert.strictEqual(keyAExecs, 1);
      assert.strictEqual(keyBExecs, 1);
    },
  );

  await t.test(
    '24. Failed Factory Cleanup: Throwing factory does not poison cache and allows retry',
    async () => {
      const cache = new CacheManager();
      let attempt = 0;

      // First attempt fails
      await assert.rejects(async () => {
        await cache.getOrSet('retryable', async () => {
          attempt++;
          throw new Error('Factory exploded');
        });
      });

      assert.strictEqual(attempt, 1);
      assert.strictEqual(await cache.get('retryable'), undefined);

      // Second attempt succeeds
      const recovered = await cache.getOrSet('retryable', async () => {
        attempt++;
        return 'recovered-data';
      });

      assert.strictEqual(recovered, 'recovered-data');
      assert.strictEqual(attempt, 2);
    },
  );

  await t.test('25. Lifecycle Transitions: CREATED -> READY -> STOPPING -> STOPPED', async () => {
    const cache = new CacheManager({ autoStart: false });
    assert.strictEqual(cache.state, 'CREATED');

    cache.start();
    assert.strictEqual(cache.state, 'READY');

    // Idempotent start
    cache.start();
    assert.strictEqual(cache.state, 'READY');

    await cache.stop();
    assert.strictEqual(cache.state, 'STOPPED');

    // Idempotent stop
    await cache.stop();
    assert.strictEqual(cache.state, 'STOPPED');
  });

  await t.test(
    '26. Lifecycle Enforcement: Rejects operations before READY and after STOPPED',
    async () => {
      const unstarted = new CacheManager({ autoStart: false });
      await assert.rejects(
        async () => unstarted.get('k'),
        (err: Error) => err instanceof CacheStateError,
      );

      const stopped = new CacheManager();
      await stopped.stop();

      await assert.rejects(
        async () => stopped.get('k'),
        (err: Error) => err instanceof CacheStateError,
      );
      await assert.rejects(
        async () => stopped.set('k', 'v'),
        (err: Error) => err instanceof CacheStateError,
      );
      await assert.rejects(
        async () => stopped.delete('k'),
        (err: Error) => err instanceof CacheStateError,
      );
      await assert.rejects(
        async () => stopped.clear(),
        (err: Error) => err instanceof CacheStateError,
      );
      await assert.rejects(
        async () => stopped.getOrSet('k', async () => 'v'),
        (err: Error) => err instanceof CacheStateError,
      );
    },
  );

  await t.test(
    '27. Diagnostics: Accurate metrics without storing keys, namespaces, or values',
    async () => {
      const cache = new CacheManager();
      await cache.set('k1', 'v1');
      await cache.get('k1'); // hit
      await cache.get('k2'); // miss
      await cache.delete('k1');

      await cache.getOrSet('st-1', async () => 'data');

      const diag = cache.getDiagnostics();
      assert.strictEqual(diag.sets, 2); // set('k1') + getOrSet('st-1')
      assert.strictEqual(diag.hits, 1);
      assert.strictEqual(diag.misses, 2); // get('k2') + initial get in getOrSet
      assert.strictEqual(diag.deletes, 1);
      assert.strictEqual(diag.factoryExecutions, 1);
      assert.ok(diag.averageLatencyMs >= 0);

      // Verify security: snapshot has no keys or values
      const serialized = JSON.stringify(diag);
      assert.strictEqual(serialized.includes('k1'), false);
      assert.strictEqual(serialized.includes('v1'), false);
      assert.strictEqual(serialized.includes('st-1'), false);
      assert.strictEqual(serialized.includes('data'), false);
    },
  );

  await t.test(
    '28. High Concurrency: 1,000 parallel get/set operations maintain consistency',
    async () => {
      const cache = new CacheManager();
      const tasks: Promise<unknown>[] = [];

      for (let i = 0; i < 1000; i++) {
        tasks.push(
          (async (idx) => {
            await cache.set(`user:${idx}`, { id: idx, active: true });
            const val = await cache.get<{ id: number; active: boolean }>(`user:${idx}`);
            assert.strictEqual(val?.id, idx);
          })(i),
        );
      }

      await Promise.all(tasks);
      const diag = cache.getDiagnostics();
      assert.strictEqual(diag.sets, 1000);
      assert.strictEqual(diag.hits, 1000);
    },
  );

  await t.test(
    '29. Instance Isolation: 1,000 isolated CacheManager instances have zero cross-talk',
    async () => {
      const instances: CacheManager[] = [];
      for (let i = 0; i < 1000; i++) {
        instances.push(new CacheManager());
      }

      // Set 'shared-key' with instance index on each
      await Promise.all(instances.map((c, i) => c.set('shared-key', `inst-${i}`)));

      // Verify each returns its own value
      await Promise.all(
        instances.map(async (c, i) => {
          const val = await c.get<string>('shared-key');
          assert.strictEqual(val, `inst-${i}`);
        }),
      );
    },
  );

  await t.test('30. CacheBuilder Fluent API: Builds custom configured instances', async () => {
    const customProvider = new MemoryCacheProvider();
    const customSerializer = new SnapshotSerializer();

    const cache = new CacheBuilder()
      .setProvider(customProvider)
      .setSerializer(customSerializer)
      .setDefaultTtlMs(5000)
      .setFailurePolicy('FAIL_CLOSED')
      .setAutoStart(true)
      .build();

    assert.strictEqual(cache.provider, customProvider);
    assert.strictEqual(cache.serializer, customSerializer);
    assert.strictEqual(cache.defaultTtlMs, 5000);
    assert.strictEqual(cache.failurePolicy, 'FAIL_CLOSED');
    assert.strictEqual(cache.state, 'READY');
  });

  await t.test(
    '31. Critical Architectural Boundary: Zero higher-layer or external dependencies',
    async () => {
      const pkgJsonPath = path.resolve(__dirname, '../../package.json');
      const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

      const deps = Object.keys(pkgJson.dependencies || {});
      const forbidden = [
        '@coreforge/config',
        '@coreforge/logging',
        '@coreforge/events',
        '@coreforge/runtime',
        '@coreforge/transport',
        '@coreforge/routing',
        '@coreforge/execution',
        '@coreforge/response',
        '@coreforge/controllers',
        '@coreforge/di',
        'redis',
        'ioredis',
        'memcached',
      ];

      for (const f of forbidden) {
        assert.strictEqual(
          deps.includes(f),
          false,
          `Forbidden dependency detected in @coreforge/cache: ${f}`,
        );
      }
    },
  );
});
