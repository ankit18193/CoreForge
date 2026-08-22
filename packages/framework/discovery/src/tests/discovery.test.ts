import * as assert from 'node:assert';
import { test } from 'node:test';

import { MetadataBuilder, MetadataRegistry, MetadataType } from '@coreforge/metadata';

import { DiscoveryBuilder } from '../discovery/DiscoveryBuilder';
import { DiscoveryEngine } from '../discovery/DiscoveryEngine';
import {
  DiscoveryCycleError,
  DiscoveryOrphanError,
  DiscoveryStateError,
} from '../errors/DiscoveryErrors';
import { DiscoveryState } from '../lifecycle/DiscoveryState';

test('Module Discovery Engine Package', async (t) => {
  await t.test('Successful metadata scan and grouping', async () => {
    const metadataBuilder = new MetadataBuilder();
    const metadata = new MetadataRegistry(metadataBuilder.build());

    const m = { id: 'mod-1', type: MetadataType.MODULE, name: 'Module1', dependencies: [] };
    const c = {
      id: 'ctrl-1',
      type: MetadataType.CONTROLLER,
      parentId: 'mod-1',
      name: 'Controller1',
    };
    const p = {
      id: 'prov-1',
      type: MetadataType.PROVIDER,
      parentId: 'mod-1',
      serviceToken: 'Service1',
    };
    const act = { id: 'act-1', type: MetadataType.ACTION, parentId: 'ctrl-1', name: 'Action1' };
    const r = {
      id: 'route-1',
      type: MetadataType.ROUTE,
      parentId: 'act-1',
      path: '/users',
      method: 'GET',
    };
    const mid = {
      id: 'mid-1',
      type: MetadataType.MIDDLEWARE,
      parentId: 'ctrl-1',
      middlewareName: 'Logger',
    };
    const int = {
      id: 'int-1',
      type: MetadataType.INTERCEPTOR,
      parentId: 'ctrl-1',
      interceptorName: 'Timer',
    };
    const sec = { id: 'sec-1', type: MetadataType.SECURITY, parentId: 'ctrl-1', roles: ['ADMIN'] };

    metadata.register(m);
    metadata.register(c);
    metadata.register(p);
    metadata.register(act);
    metadata.register(r);
    metadata.register(mid);
    metadata.register(int);
    metadata.register(sec);

    metadata.makeReady();

    const builder = new DiscoveryBuilder().setMetadataRegistry(metadata);
    const engine = new DiscoveryEngine(builder.build());

    assert.strictEqual(engine.state, DiscoveryState.CREATED);

    const result = await engine.discover();

    assert.strictEqual(engine.state, DiscoveryState.READY);

    assert.strictEqual(result.modules.length, 1);
    assert.strictEqual(result.controllers.length, 1);
    assert.strictEqual(result.providers.length, 1);
    assert.strictEqual(result.routes.length, 1);
    assert.strictEqual(result.middleware.length, 1);
    assert.strictEqual(result.interceptors.length, 1);
    assert.strictEqual(result.security.length, 1);

    assert.strictEqual(result.modules[0].id, 'mod-1');
    assert.strictEqual(result.controllers[0].id, 'ctrl-1');
    assert.strictEqual(result.controllers[0].parentId, 'mod-1');

    assert.strictEqual(result.graph.size, 1);
    assert.ok(result.graph.hasNode('mod-1'));

    const snapshot = engine.diagnostics.getSnapshot();
    assert.strictEqual(snapshot.modulesDiscovered, 1);
    assert.strictEqual(snapshot.controllersDiscovered, 1);
    assert.strictEqual(snapshot.dependencyGraphSize, 1);
    assert.strictEqual(snapshot.orphanCount, 0);
  });

  await t.test('Circular module dependency throws DiscoveryCycleError', async () => {
    const metadataBuilder = new MetadataBuilder();
    const metadata = new MetadataRegistry(metadataBuilder.build());

    const m1 = { id: 'mod-1', type: MetadataType.MODULE, name: 'Module1', dependencies: ['mod-2'] };
    const m2 = { id: 'mod-2', type: MetadataType.MODULE, name: 'Module2', dependencies: ['mod-1'] };

    metadata.register(m1);
    metadata.register(m2);
    metadata.makeReady();

    const builder = new DiscoveryBuilder().setMetadataRegistry(metadata);
    const engine = new DiscoveryEngine(builder.build());

    await assert.rejects(async () => {
      await engine.discover();
    }, DiscoveryCycleError);

    assert.strictEqual(engine.state, DiscoveryState.FAILED);
  });

  await t.test('Orphaned controller throws DiscoveryOrphanError', async () => {
    const metadataBuilder = new MetadataBuilder();
    const metadata = new MetadataRegistry(metadataBuilder.build());

    const c = {
      id: 'ctrl-orphan',
      type: MetadataType.CONTROLLER,
      parentId: 'non-existing-mod',
      name: 'Controller1',
    };

    metadata.register(c);
    metadata.makeReady();

    const builder = new DiscoveryBuilder().setMetadataRegistry(metadata);
    const engine = new DiscoveryEngine(builder.build());

    await assert.rejects(async () => {
      await engine.discover();
    }, DiscoveryOrphanError);
  });

  await t.test('Invalid state transitions are rejected', async () => {
    const metadataBuilder = new MetadataBuilder();
    const metadata = new MetadataRegistry(metadataBuilder.build());
    metadata.makeReady();

    const builder = new DiscoveryBuilder().setMetadataRegistry(metadata);
    const engine = new DiscoveryEngine(builder.build());

    assert.throws(() => {
      (
        (engine as unknown as Record<string, unknown>)._lifecycle as {
          transitionTo(state: DiscoveryState): void;
        }
      ).transitionTo(DiscoveryState.READY);
    }, DiscoveryStateError);
  });
});
