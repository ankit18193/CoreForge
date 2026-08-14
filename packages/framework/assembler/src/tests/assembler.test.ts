import * as assert from 'node:assert';
import { test } from 'node:test';

import { RegistrationDescriptor, ScanResult } from '@coreforge/contracts';

import { AssemblerBuilder } from '../assembler/AssemblerBuilder';
import { RuntimeAssembler } from '../assembler/RuntimeAssembler';
import {
  AssemblyGraphError,
  AssemblyStateError,
} from '../errors/AssemblyErrors';
import { RuntimeGraphBuilder } from '../graph/RuntimeGraphBuilder';
import { RuntimeGraphValidator } from '../graph/RuntimeGraphValidator';
import { AssemblyState } from '../lifecycle/AssemblyState';
import { RuntimeAssembly } from '../model/RuntimeAssembly';

test('Runtime Assembly Engine Package', async (t) => {
  const getMockScan = (registrations: RegistrationDescriptor[]): ScanResult => {
    const res = { registrations };
    Object.freeze(res.registrations);
    Object.freeze(res);
    return res;
  };

  await t.test('Runtime Graph Construction builds deterministically', () => {
    const scan = getMockScan([
      {
        id: 'mod-1',
        type: 'MODULE',
        dependencies: [],
      } as unknown as RegistrationDescriptor,
      {
        id: 'mod-2',
        type: 'MODULE',
        dependencies: ['mod-1'],
      } as unknown as RegistrationDescriptor,
    ]);

    const builder = new RuntimeGraphBuilder();
    const graph1 = builder.build(scan);
    const graph2 = builder.build(scan);

    assert.strictEqual(graph1.size, 2);
    assert.strictEqual(graph2.size, 2);
    assert.deepEqual(graph1.getDependencies('mod-2'), ['mod-1']);
    assert.deepEqual(graph2.getDependencies('mod-2'), ['mod-1']);
  });

  await t.test('Runtime Graph Validation detects circular cycles', () => {
    const scan = getMockScan([
      {
        id: 'mod-1',
        type: 'MODULE',
        dependencies: ['mod-2'],
      } as unknown as RegistrationDescriptor,
      {
        id: 'mod-2',
        type: 'MODULE',
        dependencies: ['mod-1'],
      } as unknown as RegistrationDescriptor,
    ]);

    const graph = new RuntimeGraphBuilder().build(scan);
    const validator = new RuntimeGraphValidator();

    assert.throws(() => {
      validator.validate(graph, scan);
    }, AssemblyGraphError);
  });

  await t.test('Runtime Graph Validation detects orphans', () => {
    const scan = getMockScan([
      {
        id: 'mod-1',
        type: 'MODULE',
        dependencies: ['missing-module'],
      } as unknown as RegistrationDescriptor,
    ]);

    const graph = new RuntimeGraphBuilder().build(scan);
    const validator = new RuntimeGraphValidator();

    assert.throws(() => {
      validator.validate(graph, scan);
    }, AssemblyGraphError);
  });

  await t.test(
    'Runtime Graph Validation detects unreachable cyclic component chain',
    () => {
      const scan = getMockScan([
        {
          id: 'mod-1',
          type: 'MODULE',
          dependencies: [],
        } as unknown as RegistrationDescriptor,
        {
          id: 'ctrl-1',
          type: 'CONTROLLER',
          parentId: 'ctrl-2',
        } as unknown as RegistrationDescriptor,
        {
          id: 'ctrl-2',
          type: 'CONTROLLER',
          parentId: 'ctrl-1',
        } as unknown as RegistrationDescriptor,
      ]);

      const graph = new RuntimeGraphBuilder().build(scan);
      const validator = new RuntimeGraphValidator();

      assert.throws(() => {
        validator.validate(graph, scan);
      }, AssemblyGraphError);
    },
  );

  await t.test(
    'Successful runtime assembly with deterministic ordering and caching',
    async () => {
      const scan = getMockScan([
        {
          id: 'mod-2',
          type: 'MODULE',
          dependencies: ['mod-1'],
        } as unknown as RegistrationDescriptor,
        {
          id: 'mod-1',
          type: 'MODULE',
          dependencies: [],
        } as unknown as RegistrationDescriptor,
        {
          id: 'ctrl-1',
          type: 'CONTROLLER',
          parentId: 'mod-2',
          name: 'Controller1',
        } as unknown as RegistrationDescriptor,
        {
          id: 'prov-1',
          type: 'PROVIDER',
          parentId: 'mod-1',
          serviceToken: 'Service1',
          scope: 'SINGLETON',
        } as unknown as RegistrationDescriptor,
        {
          id: 'route-1',
          type: 'ROUTE',
          parentId: 'ctrl-1',
          path: '/items',
          method: 'GET',
        } as unknown as RegistrationDescriptor,
      ]);

      const builder = new AssemblerBuilder();
      const assembler = new RuntimeAssembler(builder.build());

      assert.strictEqual(assembler.state, AssemblyState.CREATED);

      const result = await assembler.assemble(scan);
      assert.strictEqual(assembler.state, AssemblyState.READY);

      const runtime = result.runtime as RuntimeAssembly;
      assert.strictEqual(runtime.modules.length, 2);
      assert.strictEqual(runtime.controllers.length, 1);
      assert.strictEqual(runtime.providers.length, 1);
      assert.strictEqual(runtime.routes.length, 1);

      const mod1Index = runtime.modules.findIndex((m) => m.id === 'mod-1');
      const mod2Index = runtime.modules.findIndex((m) => m.id === 'mod-2');
      assert.ok(mod1Index < mod2Index);

      assert.throws(() => {
        (runtime.modules as unknown as unknown[])[0] = null;
      });
      assert.throws(() => {
        (runtime as unknown as { controllers: unknown[] }).controllers = [];
      });

      const snapshotBefore = assembler.diagnostics.getSnapshot();
      assert.strictEqual(snapshotBefore.cacheHits, 0);
      assert.strictEqual(snapshotBefore.cacheMisses, 1);

      const repeatResult = await assembler.assemble(scan);
      assert.strictEqual(repeatResult.runtime, runtime);

      const snapshotAfter = assembler.diagnostics.getSnapshot();
      assert.strictEqual(snapshotAfter.cacheHits, 1);
      assert.strictEqual(snapshotAfter.cacheMisses, 1);
    },
  );

  await t.test('Invalid lifecycle state transitions throw errors', () => {
    const builder = new AssemblerBuilder();
    const assembler = new RuntimeAssembler(builder.build());

    assert.throws(() => {
      (
        assembler as unknown as {
          _lifecycle: { transitionTo(state: AssemblyState): void };
        }
      )._lifecycle.transitionTo(AssemblyState.READY);
    }, AssemblyStateError);
  });

  await t.test(
    'Simultaneous parallel assembly requests execution isolation',
    async () => {
      const scan = getMockScan([
        {
          id: 'mod-1',
          type: 'MODULE',
          dependencies: [],
        } as unknown as RegistrationDescriptor,
      ]);

      const builder1 = new AssemblerBuilder();
      const builder2 = new AssemblerBuilder();
      const assembler1 = new RuntimeAssembler(builder1.build());
      const assembler2 = new RuntimeAssembler(builder2.build());

      const [res1, res2] = await Promise.all([
        assembler1.assemble(scan),
        assembler2.assemble(scan),
      ]);

      assert.ok(res1.runtime !== res2.runtime);
    },
  );
});
