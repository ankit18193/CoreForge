import * as assert from 'node:assert';
import { test } from 'node:test';

import { DiscoveryBuilder, DiscoveryEngine, DependencyGraph } from '@coreforge/discovery';
import { MetadataBuilder, MetadataRegistry, MetadataType, MetadataDescriptor } from '@coreforge/metadata';

import { CompilerBuilder } from '../compiler/CompilerBuilder';
import { ModuleCompiler } from '../compiler/ModuleCompiler';
import {
  CompilationStateError,
  CompilationValidationError,
} from '../errors/CompilerErrors';
import { CompilerState } from '../lifecycle/CompilerState';
import { ApplicationModel } from '../model/ApplicationModel';

test('Module Compiler Package', async (t) => {
  const getMockDiscovery = async (
    modules: Record<string, unknown>[],
    others: Record<string, unknown>[] = [],
  ) => {
    const metadataBuilder = new MetadataBuilder();
    const metadata = new MetadataRegistry(metadataBuilder.build());

    for (const m of modules) {
      metadata.register(m as unknown as MetadataDescriptor);
    }
    for (const o of others) {
      metadata.register(o as unknown as MetadataDescriptor);
    }
    metadata.makeReady();

    const dBuilder = new DiscoveryBuilder().setMetadataRegistry(metadata);
    const engine = new DiscoveryEngine(dBuilder.build());
    return engine.discover();
  };

  await t.test('Successful compilation and caching', async () => {
    const discovery = await getMockDiscovery(
      [{ id: 'mod-1', type: MetadataType.MODULE, name: 'Module1', dependencies: [] }],
      [
        { id: 'ctrl-1', type: MetadataType.CONTROLLER, parentId: 'mod-1', name: 'Controller1' },
        { id: 'prov-1', type: MetadataType.PROVIDER, parentId: 'mod-1', serviceToken: 'Service1' },
        { id: 'act-1', type: MetadataType.ACTION, parentId: 'ctrl-1', name: 'Action1' },
        { id: 'route-1', type: MetadataType.ROUTE, parentId: 'act-1', path: '/users', method: 'GET' },
      ],
    );

    const builder = new CompilerBuilder();
    const compiler = new ModuleCompiler(builder.build());

    assert.strictEqual(compiler.state, CompilerState.CREATED);

    const result = await compiler.compile(discovery);
    assert.strictEqual(compiler.state, CompilerState.COMPILED);

    const appModel = result.application as ApplicationModel;
    assert.strictEqual(appModel.modules.length, 1);
    assert.strictEqual(appModel.controllers.length, 1);
    assert.strictEqual(appModel.providers.length, 1);
    assert.strictEqual(appModel.routes.length, 1);

    const snapshot = compiler.diagnostics.getSnapshot();
    assert.strictEqual(snapshot.compiledModules, 1);
    assert.strictEqual(snapshot.compiledRoutes, 1);
    assert.strictEqual(snapshot.validationFailures, 0);

    const repeatResult = await compiler.compile(discovery);
    assert.strictEqual(repeatResult.application, appModel);
  });

  await t.test('ApplicationModel immutability check', async () => {
    const discovery = await getMockDiscovery([
      { id: 'mod-1', type: MetadataType.MODULE, name: 'Module1', dependencies: [] },
    ]);
    const builder = new CompilerBuilder();
    const compiler = new ModuleCompiler(builder.build());

    const result = await compiler.compile(discovery);
    const appModel = result.application as ApplicationModel;

    assert.throws(() => {
      (appModel as unknown as Record<string, unknown>).modules = [];
    });
  });

  await t.test('Duplicate routes validation fail', async () => {
    const discovery = await getMockDiscovery(
      [{ id: 'mod-1', type: MetadataType.MODULE, name: 'Module1', dependencies: [] }],
      [
        { id: 'ctrl-1', type: MetadataType.CONTROLLER, parentId: 'mod-1', name: 'Controller1' },
        { id: 'act-1', type: MetadataType.ACTION, parentId: 'ctrl-1', name: 'Action1' },
        { id: 'route-1', type: MetadataType.ROUTE, parentId: 'act-1', path: '/users', method: 'GET' },
        { id: 'route-2', type: MetadataType.ROUTE, parentId: 'act-1', path: '/users', method: 'GET' },
      ],
    );

    const builder = new CompilerBuilder();
    const compiler = new ModuleCompiler(builder.build());

    await assert.rejects(async () => {
      await compiler.compile(discovery);
    }, CompilationValidationError);

    assert.strictEqual(compiler.state, CompilerState.FAILED);
    assert.strictEqual(compiler.diagnostics.getSnapshot().validationFailures, 1);
  });

  await t.test('Duplicate providers validation fail', async () => {
    const discovery = {
      graph: new DependencyGraph(),
      modules: [{ id: 'mod-1', type: MetadataType.MODULE, name: 'Module1', dependencies: [] }],
      controllers: [],
      providers: [
        { id: 'prov-1', type: MetadataType.PROVIDER, parentId: 'mod-1', serviceToken: 'Service1' },
        { id: 'prov-2', type: MetadataType.PROVIDER, parentId: 'mod-1', serviceToken: 'Service1' },
      ],
      routes: [],
      middleware: [],
      interceptors: [],
      security: [],
    };

    const builder = new CompilerBuilder();
    const compiler = new ModuleCompiler(builder.build());

    await assert.rejects(async () => {
      await compiler.compile(discovery);
    }, CompilationValidationError);
  });

  await t.test('Invalid hierarchy validation fail', async () => {
    const discovery = {
      graph: new DependencyGraph(),
      modules: [{ id: 'mod-1', type: MetadataType.MODULE, name: 'Module1', dependencies: [] }],
      controllers: [
        {
          id: 'ctrl-1',
          type: MetadataType.CONTROLLER,
          parentId: 'missing-module-id',
          name: 'Controller1',
        },
      ],
      providers: [],
      routes: [],
      middleware: [],
      interceptors: [],
      security: [],
    };

    const builder = new CompilerBuilder();
    const compiler = new ModuleCompiler(builder.build());

    await assert.rejects(async () => {
      await compiler.compile(discovery);
    }, CompilationValidationError);
  });

  await t.test('Invalid state transitions are rejected', async () => {
    const builder = new CompilerBuilder();
    const compiler = new ModuleCompiler(builder.build());

    assert.throws(() => {
      ((compiler as unknown as Record<string, unknown>)._lifecycle as {
        transitionTo(state: CompilerState): void;
      }).transitionTo(CompilerState.COMPILED);
    }, CompilationStateError);
  });
});
