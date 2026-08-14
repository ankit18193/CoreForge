import * as assert from 'node:assert';
import { test } from 'node:test';

import {
  ExtensionLoadError,
  ExtensionStateError,
  ExtensionValidationError,
} from '../errors/ExtensionErrors';
import { ExtensionState } from '../lifecycle/ExtensionState';
import { ExtensionBuilder } from '../manager/ExtensionBuilder';
import { ExtensionManager } from '../manager/ExtensionManager';

test('Framework Extension Engine Package', async (t) => {
  await t.test(
    'Extension registration and dependency ordering is deterministic',
    async () => {
      const builder = new ExtensionBuilder();
      const manager = new ExtensionManager(builder.build());

      assert.strictEqual(manager.state, ExtensionState.CREATED);

      manager.register({
        id: 'ext-a',
        version: '1.0.0',
        dependencies: ['ext-b'],
      });
      manager.register({ id: 'ext-b', version: '1.0.0' });

      assert.strictEqual(manager.registered().length, 2);

      await manager.enable('ext-a');
      assert.strictEqual(manager.state, ExtensionState.ENABLED);

      assert.throws(() => {
        manager.register({ id: 'ext-c', version: '1.0.0' });
      });

      const snap = manager.diagnostics.getSnapshot();
      assert.strictEqual(snap.registeredCount, 2);
      assert.strictEqual(snap.dependencyGraphSize, 2);
      assert.strictEqual(snap.dependencyGraphDepth, 2);
      assert.ok(snap.enabledCount >= 1);
    },
  );

  await t.test('Duplicate registrations fail', () => {
    const builder = new ExtensionBuilder();
    const manager = new ExtensionManager(builder.build());

    manager.register({ id: 'ext-a', version: '1.0.0' });
    assert.throws(() => {
      manager.register({ id: 'ext-a', version: '2.0.0' });
    }, ExtensionValidationError);
  });

  await t.test('Dependency resolution rejects cycles', async () => {
    const builder = new ExtensionBuilder();
    const manager = new ExtensionManager(builder.build());

    manager.register({
      id: 'ext-a',
      version: '1.0.0',
      dependencies: ['ext-b'],
    });
    manager.register({
      id: 'ext-b',
      version: '1.0.0',
      dependencies: ['ext-a'],
    });

    await assert.rejects(async () => {
      await manager.enable('ext-a');
    }, ExtensionLoadError);

    assert.strictEqual(manager.state, ExtensionState.FAILED);
  });

  await t.test(
    'Enable/disable operations update state and diagnostics',
    async () => {
      const builder = new ExtensionBuilder();
      const manager = new ExtensionManager(builder.build());

      manager.register({ id: 'ext-a', version: '1.0.0' });
      await manager.enable('ext-a');
      assert.strictEqual(manager.state, ExtensionState.ENABLED);

      await manager.disable('ext-a');
      assert.strictEqual(manager.state, ExtensionState.DISABLED);

      const snap = manager.diagnostics.getSnapshot();
      assert.ok(snap.enabledTimestamp > 0);
      assert.ok(snap.disabledTimestamp > 0);
    },
  );

  await t.test(
    'Parallel enable()/disable() operations are rejected safely',
    async () => {
      const builder = new ExtensionBuilder();
      const manager = new ExtensionManager(builder.build());

      manager.register({ id: 'ext-a', version: '1.0.0' });
      const p1 = manager.enable('ext-a');

      await assert.rejects(async () => {
        await manager.enable('ext-a');
      }, ExtensionStateError);

      await p1;
    },
  );

  await t.test('Invalid lifecycle state transitions throw errors', () => {
    const builder = new ExtensionBuilder();
    const manager = new ExtensionManager(builder.build());

    assert.throws(() => {
      (
        manager as unknown as {
          context: { lifecycle: { transitionTo(state: ExtensionState): void } };
        }
      ).context.lifecycle.transitionTo(ExtensionState.ENABLED);
    }, ExtensionStateError);
  });
});
