import * as assert from 'node:assert';
import { test } from 'node:test';

import { Plugin } from '@coreforge/contracts';

import {
  PluginLoadError,
  PluginStateError,
  PluginValidationError,
} from '../errors/PluginErrors';
import { PluginState } from '../lifecycle/PluginState';
import { PluginBuilder } from '../manager/PluginBuilder';
import { PluginManager } from '../manager/PluginManager';

interface MockPlugin extends Plugin {
  getInitCount(): number;
  getStopCount(): number;
}

test('Framework Plugin System Package', async (t) => {
  const getMockPlugin = (): MockPlugin => {
    let initCount = 0;
    let stopCount = 0;
    return {
      async initialize(context: unknown) {
        initCount++;
        const ctx = context as { capabilities: Record<string, unknown> };
        assert.ok(ctx.capabilities);
        assert.throws(() => {
          ctx.capabilities.logger = {};
        });
      },
      async shutdown() {
        stopCount++;
      },
      getInitCount() {
        return initCount;
      },
      getStopCount() {
        return stopCount;
      },
    };
  };

  await t.test(
    'Plugin registration and dependency ordering is deterministic',
    async () => {
      const builder = new PluginBuilder();
      const manager = new PluginManager(builder.build());

      assert.strictEqual(manager.state, PluginState.CREATED);

      manager.register({
        id: 'plug-a',
        version: '1.0.0',
        dependencies: ['plug-b'],
      });
      manager.register({ id: 'plug-b', version: '1.0.0' });

      assert.strictEqual(manager.registered().length, 2);

      await manager.enable('plug-a');
      assert.strictEqual(manager.state, PluginState.ENABLED);

      assert.throws(() => {
        manager.register({ id: 'plug-c', version: '1.0.0' });
      });

      const snap = manager.diagnostics.getSnapshot();
      assert.strictEqual(snap.registeredCount, 2);
      assert.strictEqual(snap.dependencyGraphSize, 2);
      assert.strictEqual(snap.dependencyGraphDepth, 2);
      assert.ok(snap.enabledCount >= 1);
    },
  );

  await t.test('Duplicate registrations fail', () => {
    const builder = new PluginBuilder();
    const manager = new PluginManager(builder.build());

    manager.register({ id: 'plug-a', version: '1.0.0' });
    assert.throws(() => {
      manager.register({ id: 'plug-a', version: '2.0.0' });
    }, PluginValidationError);
  });

  await t.test(
    'Dependency resolution rejects cycles and missing dependencies',
    async () => {
      const builder = new PluginBuilder();
      const manager = new PluginManager(builder.build());

      manager.register({
        id: 'plug-a',
        version: '1.0.0',
        dependencies: ['plug-b'],
      });
      manager.register({
        id: 'plug-b',
        version: '1.0.0',
        dependencies: ['plug-a'],
      });

      await assert.rejects(async () => {
        await manager.enable('plug-a');
      }, PluginLoadError);

      assert.strictEqual(manager.state, PluginState.FAILED);

      const manager2 = new PluginManager(builder.build());
      manager2.register({
        id: 'plug-x',
        version: '1.0.0',
        dependencies: ['missing-dep'],
      });
      await assert.rejects(async () => {
        await manager2.enable('plug-x');
      }, PluginLoadError);
    },
  );

  await t.test(
    'Plugin initialization and shutdown executes exactly once',
    async () => {
      const builder = new PluginBuilder();
      const manager = new PluginManager(builder.build());

      manager.register({ id: 'plug-a', version: '1.0.0' });
      await manager.enable('plug-a');

      const plugin = getMockPlugin();
      await manager.initializer.initializePlugin('plug-a', plugin);

      await assert.rejects(async () => {
        await manager.initializer.initializePlugin('plug-a', plugin);
      }, PluginValidationError);

      assert.strictEqual(plugin.getInitCount(), 1);

      await manager.initializer.shutdownPlugin('plug-a', plugin);
      await assert.rejects(async () => {
        await manager.initializer.shutdownPlugin('plug-a', plugin);
      }, PluginValidationError);

      assert.strictEqual(plugin.getStopCount(), 1);
    },
  );

  await t.test(
    'Parallel enable()/disable() operations are rejected safely',
    async () => {
      const builder = new PluginBuilder();
      const manager = new PluginManager(builder.build());

      manager.register({ id: 'plug-a', version: '1.0.0' });
      const p1 = manager.enable('plug-a');

      await assert.rejects(async () => {
        await manager.enable('plug-a');
      }, PluginStateError);

      await p1;
    },
  );

  await t.test('Invalid lifecycle state transitions throw errors', () => {
    const builder = new PluginBuilder();
    const manager = new PluginManager(builder.build());

    assert.throws(() => {
      (
        manager as unknown as {
          context: { lifecycle: { transitionTo(state: PluginState): void } };
        }
      ).context.lifecycle.transitionTo(PluginState.ENABLED);
    }, PluginStateError);
  });
});
