import * as assert from 'node:assert';
import { test } from 'node:test';

import { RouteMethod } from '@coreforge/contracts';

import { DuplicateRouteError, RouteConflictError, RouterStateError } from '../errors/RouterErrors';
import { RouteGroup } from '../router/RouteGroup';
import { RouterBuilder } from '../router/RouterBuilder';
import { RouteState } from '../router/RouteState';

test('Routing Engine Framework Package', async (t) => {
  await t.test('RouterBuilder - Options validation and configurations building', async () => {
    const builder = new RouterBuilder();
    builder.configurePrefix('/api/v1');
    builder.configureCaseSensitive(true);

    assert.throws(() => {
      builder.configurePrefix('/another');
    }, RouterStateError);

    assert.throws(() => {
      builder.configurePrefix('invalid-no-slash');
    }, RouterStateError);

    const router = builder.build();
    assert.strictEqual(router.state, RouteState.CREATED);
  });

  await t.test('RouteGroup Support (Metadata Only)', async () => {
    const group: RouteGroup = {
      prefix: '/api/v2',
      version: 'v2',
      tags: ['auth', 'users'],
      metadata: { env: 'production' },
    };
    assert.strictEqual(group.prefix, '/api/v2');
    assert.strictEqual(group.version, 'v2');
  });

  await t.test('Route Registration & Segment Matching', async () => {
    const router = new RouterBuilder().build();

    router.register({ method: RouteMethod.GET, path: '/users' });
    router.register({ method: RouteMethod.GET, path: '/users/:id' });
    router.register({ method: RouteMethod.GET, path: '/users/:id/posts/:postId' });
    router.register({ method: RouteMethod.GET, path: '/files/*' });

    const match1 = router.resolve(RouteMethod.GET, '/users');
    assert.ok(match1);
    assert.strictEqual(match1.route.path, '/users');

    const match2 = router.resolve(RouteMethod.GET, '/users/42');
    assert.ok(match2);
    assert.strictEqual(match2.route.path, '/users/:id');
    assert.strictEqual(match2.parameters.id, '42');

    const match3 = router.resolve(RouteMethod.GET, '/users/42/posts/100');
    assert.ok(match3);
    assert.strictEqual(match3.parameters.id, '42');
    assert.strictEqual(match3.parameters.postId, '100');

    const match4 = router.resolve(RouteMethod.GET, '/files/images/avatar.png');
    assert.ok(match4);
    assert.strictEqual(match4.parameters['*'], 'images/avatar.png');
  });

  await t.test('Precedence resolution - Static routes take priority over parameters', async () => {
    const router = new RouterBuilder().build();

    router.register({ method: RouteMethod.GET, path: '/users/:id' });
    router.register({ method: RouteMethod.GET, path: '/users/search' });
    router.register({ method: RouteMethod.GET, path: '/users/*' });

    const match = router.resolve(RouteMethod.GET, '/users/search');
    assert.ok(match);
    assert.strictEqual(match.route.path, '/users/search');

    const matchParam = router.resolve(RouteMethod.GET, '/users/alice');
    assert.ok(matchParam);
    assert.strictEqual(matchParam.route.path, '/users/:id');
  });

  await t.test(
    'Conflict detection - Rejects identical paths and colliding parameter names',
    async () => {
      const router = new RouterBuilder().build();

      router.register({ method: RouteMethod.GET, path: '/users/:id' });

      assert.throws(() => {
        router.register({ method: RouteMethod.GET, path: '/users/:id' });
      }, DuplicateRouteError);

      assert.throws(() => {
        router.register({ method: RouteMethod.GET, path: '/users/:userId' });
      }, RouteConflictError);
    },
  );

  await t.test(
    'Lifecycle controls - Blocks registrations once READY, blocks resolve once STOPPED',
    async () => {
      const router = new RouterBuilder().build();

      router.register({ method: RouteMethod.GET, path: '/users' });

      router.resolve(RouteMethod.GET, '/users');
      assert.strictEqual(router.state, RouteState.READY);

      assert.throws(() => {
        router.register({ method: RouteMethod.POST, path: '/users' });
      }, RouterStateError);

      router.stop();
      assert.strictEqual(router.state, RouteState.STOPPED);

      assert.throws(() => {
        router.resolve(RouteMethod.GET, '/users');
      }, RouterStateError);
    },
  );

  await t.test('Diagnostics Snapshot - Captures route stats and latencies', async () => {
    const router = new RouterBuilder().build();

    router.register({ method: RouteMethod.GET, path: '/static' });
    router.register({ method: RouteMethod.GET, path: '/param/:id' });
    router.register({ method: RouteMethod.GET, path: '/wildcard/*' });

    router.resolve(RouteMethod.GET, '/static');

    const diag = router.diagnostics;
    assert.strictEqual(diag.totalRoutes, 3);
    assert.strictEqual(diag.staticRoutes, 1);
    assert.strictEqual(diag.parameterRoutes, 1);
    assert.strictEqual(diag.wildcardRoutes, 1);
    assert.strictEqual(diag.lookupCount, 1);
    assert.ok(diag.routeCompilationTime >= 0);
  });

  await t.test('Immutability Checks', async () => {
    const router = new RouterBuilder().build();
    router.register({ method: RouteMethod.GET, path: '/users/:id' });
    const match = router.resolve(RouteMethod.GET, '/users/5');

    assert.ok(match);
    assert.throws(() => {
      (match.parameters as unknown as Record<string, string>).id = 'mutated';
    });
  });

  await t.test(
    'Stress Scale Test - 1,000 compiled routes registration and resolution speed',
    async () => {
      const router = new RouterBuilder().build();

      for (let i = 0; i < 1000; i++) {
        router.register({
          method: RouteMethod.GET,
          path: `/route-${i}/:id`,
        });
      }

      const start = Date.now();
      const match = router.resolve(RouteMethod.GET, '/route-999/42');
      const elapsed = Date.now() - start;

      assert.ok(match);
      assert.strictEqual(match.route.path, '/route-999/:id');
      assert.strictEqual(match.parameters.id, '42');

      assert.ok(elapsed < 100, `Lookup time too slow: ${elapsed}ms`);
    },
  );
});
