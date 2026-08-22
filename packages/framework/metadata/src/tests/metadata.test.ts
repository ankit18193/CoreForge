import * as assert from 'node:assert';
import { test } from 'node:test';

import { MetadataType } from '@coreforge/contracts';

import { ActionMetadata } from '../descriptors/ActionMetadata';
import { ControllerMetadata } from '../descriptors/ControllerMetadata';
import { ModuleMetadata } from '../descriptors/ModuleMetadata';
import { ParameterMetadata } from '../descriptors/ParameterMetadata';
import { RouteMetadata } from '../descriptors/RouteMetadata';
import { MetadataDuplicateError, MetadataStateError } from '../errors/MetadataErrors';
import { MetadataState } from '../lifecycle/MetadataState';
import { MetadataBuilder } from '../metadata/MetadataBuilder';
import { MetadataRegistry } from '../metadata/MetadataRegistry';

test('Metadata System Package', async (t) => {
  await t.test('Successful registration and hierarchy traversal', async () => {
    const builder = new MetadataBuilder();
    const registry = new MetadataRegistry(builder.build());

    const module = new ModuleMetadata({ id: 'mod-1', name: 'Module1' });
    const controller = new ControllerMetadata({
      id: 'ctrl-1',
      parentId: 'mod-1',
      name: 'Controller1',
    });
    const action = new ActionMetadata({ id: 'act-1', parentId: 'ctrl-1', name: 'Action1' });
    const param = new ParameterMetadata({
      id: 'param-1',
      parentId: 'act-1',
      name: 'id',
      index: 0,
      paramType: 'string',
    });

    registry.register(module);
    registry.register(controller);
    registry.register(action);
    registry.register(param);

    registry.makeReady();

    const resolvedParam = registry.resolver.query({ type: MetadataType.PARAMETER })[0];
    assert.strictEqual(resolvedParam.id, 'param-1');
    assert.strictEqual(resolvedParam.parentId, 'act-1');

    const parentAction = registry.index.getById(resolvedParam.parentId!);
    assert.ok(parentAction);
    assert.strictEqual(parentAction.parentId, 'ctrl-1');

    const parentCtrl = registry.index.getById(parentAction.parentId!);
    assert.ok(parentCtrl);
    assert.strictEqual(parentCtrl.parentId, 'mod-1');
  });

  await t.test('Duplicate registration throws MetadataDuplicateError', async () => {
    const builder = new MetadataBuilder();
    const registry = new MetadataRegistry(builder.build());

    const m1 = new ModuleMetadata({ id: 'mod-duplicate', name: 'Module1' });
    const m2 = new ModuleMetadata({ id: 'mod-duplicate', name: 'Module2' });

    registry.register(m1);
    assert.throws(() => {
      registry.register(m2);
    }, MetadataDuplicateError);
  });

  await t.test('Registry becomes immutable after READY state transition', async () => {
    const builder = new MetadataBuilder();
    const registry = new MetadataRegistry(builder.build());

    const m1 = new ModuleMetadata({ id: 'mod-1', name: 'Module1' });
    registry.register(m1);

    registry.makeReady();
    assert.strictEqual(registry.state, MetadataState.READY);

    const m2 = new ModuleMetadata({ id: 'mod-2', name: 'Module2' });
    assert.throws(() => {
      registry.register(m2);
    }, MetadataStateError);
  });

  await t.test('Lookup index O(1) checks and cache hits/misses evaluation', async () => {
    const builder = new MetadataBuilder();
    const registry = new MetadataRegistry(builder.build());

    const module = new ModuleMetadata({ id: 'mod-1', name: 'Module1' });
    registry.register(module);
    registry.makeReady();

    const start = process.hrtime.bigint();
    const retrieved = registry.index.getById('mod-1');
    const elapsed = process.hrtime.bigint() - start;

    assert.ok(retrieved);
    assert.ok(elapsed < 1_000_000n);

    assert.strictEqual(registry.diagnostics.getSnapshot().cacheMisses, 0);
    assert.strictEqual(registry.diagnostics.getSnapshot().cacheHits, 0);

    registry.resolve(MetadataType.MODULE);
    assert.strictEqual(registry.diagnostics.getSnapshot().cacheMisses, 1);
    assert.strictEqual(registry.diagnostics.getSnapshot().cacheHits, 0);

    registry.resolve(MetadataType.MODULE);
    assert.strictEqual(registry.diagnostics.getSnapshot().cacheMisses, 1);
    assert.strictEqual(registry.diagnostics.getSnapshot().cacheHits, 1);
  });

  await t.test('Descriptor deep freeze enforcements', async () => {
    const builder = new MetadataBuilder();
    const registry = new MetadataRegistry(builder.build());

    const module = new ModuleMetadata({ id: 'mod-1', name: 'Module1' });
    registry.register(module);

    registry.makeReady();

    assert.throws(() => {
      (module as unknown as Record<string, unknown>).name = 'mutated';
    });
  });

  await t.test('Lazy traversal via MetadataCursor', async () => {
    const builder = new MetadataBuilder();
    const registry = new MetadataRegistry(builder.build());

    const r1 = new RouteMetadata({ id: 'route-1', path: '/users', method: 'GET' });
    const r2 = new RouteMetadata({ id: 'route-2', path: '/users/:id', method: 'GET' });

    registry.register(r1);
    registry.register(r2);
    registry.makeReady();

    const cursor = registry.resolver.queryCursor({ type: MetadataType.ROUTE });
    assert.ok(cursor.hasNext());
    assert.strictEqual(cursor.next().id, 'route-1');
    assert.ok(cursor.hasNext());
    assert.strictEqual(cursor.next().id, 'route-2');
    assert.strictEqual(cursor.hasNext(), false);
  });

  await t.test('State transition enforcements', async () => {
    const builder = new MetadataBuilder();
    const registry = new MetadataRegistry(builder.build());

    assert.throws(() => {
      (
        (registry as unknown as Record<string, unknown>)._lifecycle as {
          transitionTo(state: MetadataState): void;
        }
      ).transitionTo(MetadataState.STOPPED);
    }, MetadataStateError);
  });
});
