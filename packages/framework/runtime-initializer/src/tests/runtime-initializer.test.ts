import * as assert from 'node:assert';
import { test } from 'node:test';

import { RuntimeAssembly } from '@coreforge/contracts';

import {
  RuntimeInitializationError,
  RuntimeInitializationStateError,
} from '../errors/RuntimeInitializationErrors';
import { RuntimeInitializer } from '../initializer/RuntimeInitializer';
import { RuntimeInitializerBuilder } from '../initializer/RuntimeInitializerBuilder';
import { RuntimeInitializationState } from '../lifecycle/RuntimeInitializationState';

test('Runtime Initialization Engine Package', async (t) => {
  const getMockAssembly = (params: {
    modules?: unknown[];
    providers?: unknown[];
    controllers?: unknown[];
    routes?: unknown[];
    middleware?: unknown[];
    interceptors?: unknown[];
    security?: unknown[];
  }): RuntimeAssembly => {
    const res = {
      modules: params.modules || [],
      providers: params.providers || [],
      controllers: params.controllers || [],
      routes: params.routes || [],
      middleware: params.middleware || [],
      interceptors: params.interceptors || [],
      security: params.security || [],
    };
    Object.freeze(res.modules);
    Object.freeze(res.providers);
    Object.freeze(res.controllers);
    Object.freeze(res.routes);
    Object.freeze(res.middleware);
    Object.freeze(res.interceptors);
    Object.freeze(res.security);
    Object.freeze(res);
    return res as unknown as RuntimeAssembly;
  };

  await t.test(
    'Successful initialization with deterministic order and diagnostics',
    async () => {
      const assembly = getMockAssembly({
        modules: [{ id: 'mod-1', name: 'Module1', dependencies: [] }],
        providers: [
          {
            id: 'prov-1',
            parentId: 'mod-1',
            serviceToken: 'Service1',
            scope: 'SINGLETON',
          },
        ],
        controllers: [{ id: 'ctrl-1', name: 'Controller1', parentId: 'mod-1' }],
        routes: [
          { id: 'route-1', parentId: 'ctrl-1', path: '/items', method: 'GET' },
        ],
      });

      const builder = new RuntimeInitializerBuilder();
      const initializer = new RuntimeInitializer(builder.build());

      assert.strictEqual(
        initializer.state,
        RuntimeInitializationState.CREATED,
      );

      const result = await initializer.initialize(assembly);
      assert.strictEqual(initializer.state, RuntimeInitializationState.READY);

      const runtime = result.runtime;
      assert.strictEqual(runtime.modules.length, 1);
      assert.strictEqual(runtime.providers.length, 1);
      assert.strictEqual(runtime.controllers.length, 1);
      assert.strictEqual(runtime.routes.length, 1);

      const mod = runtime.modules[0] as { id: string; state: string };
      assert.strictEqual(mod.id, 'mod-1');
      assert.strictEqual(mod.state, 'INITIALIZED');

      assert.throws(() => {
        (runtime.modules as unknown as unknown[])[0] = null;
      });
      assert.throws(() => {
        (runtime as unknown as { controllers: unknown[] }).controllers = [];
      });

      const snap = initializer.diagnostics.getSnapshot();
      assert.strictEqual(snap.initializedModules, 1);
      assert.strictEqual(snap.initializedProviders, 1);
      assert.strictEqual(snap.initializedControllers, 1);
      assert.strictEqual(snap.initializedRoutes, 1);
      assert.strictEqual(snap.initializationFailures, 0);
    },
  );

  await t.test(
    'Automated rollback executes in reverse order on failure',
    async () => {
      const mockModule = {
        id: 'mod-1',
        name: 'Module1',
        dependencies: [],
      };

      const throwingController = {
        get id() {
          throw new Error('ControllerInitFailed');
        },
        type: 'CONTROLLER',
      };

      const assembly = getMockAssembly({
        modules: [mockModule],
        controllers: [throwingController],
      });

      const builder = new RuntimeInitializerBuilder();
      const initializer = new RuntimeInitializer(builder.build());

      await assert.rejects(async () => {
        await initializer.initialize(assembly);
      }, RuntimeInitializationError);

      assert.strictEqual(initializer.state, RuntimeInitializationState.FAILED);

      const snap = initializer.diagnostics.getSnapshot();
      assert.strictEqual(snap.initializationFailures, 1);
      assert.strictEqual(snap.rollbackExecutions, 1);
    },
  );

  await t.test('Invalid lifecycle state transitions throw errors', () => {
    const builder = new RuntimeInitializerBuilder();
    const initializer = new RuntimeInitializer(builder.build());

    assert.throws(() => {
      (
        initializer as unknown as {
          _lifecycle: {
            transitionTo(state: RuntimeInitializationState): void;
          };
        }
      )._lifecycle.transitionTo(RuntimeInitializationState.READY);
    }, RuntimeInitializationStateError);
  });

  await t.test(
    'Simultaneous parallel initialization executions isolation',
    async () => {
      const assembly = getMockAssembly({
        modules: [{ id: 'mod-1', name: 'Module1', dependencies: [] }],
      });

      const builder = new RuntimeInitializerBuilder();
      const initializer1 = new RuntimeInitializer(builder.build());
      const initializer2 = new RuntimeInitializer(builder.build());

      const [res1, res2] = await Promise.all([
        initializer1.initialize(assembly),
        initializer2.initialize(assembly),
      ]);

      assert.ok(res1.runtime !== res2.runtime);
    },
  );
});
