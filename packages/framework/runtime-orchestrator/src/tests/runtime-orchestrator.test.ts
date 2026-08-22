import * as assert from 'node:assert';
import { test } from 'node:test';

import { InitializedRuntime } from '@coreforge/contracts';

import { RuntimeExecutionStateError, RuntimeStartupError } from '../errors/RuntimeExecutionErrors';
import { RuntimeExecutionState } from '../lifecycle/RuntimeExecutionState';
import { RuntimeOrchestrator } from '../orchestrator/RuntimeOrchestrator';
import { RuntimeOrchestratorBuilder } from '../orchestrator/RuntimeOrchestratorBuilder';

test('Runtime Orchestration Engine Package', async (t) => {
  const getMockRuntime = (params: {
    modules?: unknown[];
    providers?: unknown[];
    controllers?: unknown[];
    routes?: unknown[];
    middleware?: unknown[];
    interceptors?: unknown[];
    security?: unknown[];
  }): InitializedRuntime => {
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
    return res as unknown as InitializedRuntime;
  };

  await t.test('Successful startup, registry lookup, and diagnostics verification', async () => {
    const runtime = getMockRuntime({
      modules: [{ id: 'mod-1', name: 'Module1' }],
      providers: [{ id: 'prov-1', serviceToken: 'Service1' }],
    });

    const builder = new RuntimeOrchestratorBuilder();
    const orchestrator = new RuntimeOrchestrator(builder.build());

    assert.strictEqual(orchestrator.state, RuntimeExecutionState.CREATED);

    const result = await orchestrator.start(runtime);
    assert.strictEqual(orchestrator.state, RuntimeExecutionState.RUNNING);
    assert.strictEqual(result.started, true);

    assert.ok(orchestrator.registry.has('mod-1'));
    assert.ok(orchestrator.registry.has('prov-1'));
    assert.ok(orchestrator.registry.has('http-server'));

    assert.throws(() => {
      orchestrator.registry.register('new-node', {});
    });

    const snap = orchestrator.diagnostics.getSnapshot();
    assert.strictEqual(snap.activeComponentCount, 3);
    assert.strictEqual(snap.failedComponentCount, 0);
    assert.strictEqual(snap.healthCheckCount, 1);

    await orchestrator.stop();
    assert.strictEqual(orchestrator.state, RuntimeExecutionState.STOPPED);

    await orchestrator.stop();
    assert.strictEqual(orchestrator.state, RuntimeExecutionState.STOPPED);
  });

  await t.test('Startup failures trigger automatic rollback', async () => {
    const throwingModule = {
      get id() {
        throw new Error('ModuleStartFailed');
      },
    };

    const runtime = getMockRuntime({
      modules: [throwingModule],
    });

    const builder = new RuntimeOrchestratorBuilder();
    const orchestrator = new RuntimeOrchestrator(builder.build());

    await assert.rejects(async () => {
      await orchestrator.start(runtime);
    }, RuntimeStartupError);

    assert.strictEqual(orchestrator.state, RuntimeExecutionState.FAILED);
  });

  await t.test('Parallel start() requests are rejected safely', async () => {
    const runtime = getMockRuntime({
      modules: [{ id: 'mod-1' }],
    });

    const builder = new RuntimeOrchestratorBuilder();
    const orchestrator = new RuntimeOrchestrator(builder.build());

    const p1 = orchestrator.start(runtime);

    await assert.rejects(async () => {
      await orchestrator.start(runtime);
    }, RuntimeExecutionStateError);

    await p1;
  });

  await t.test('Invalid lifecycle state transitions throw errors', () => {
    const builder = new RuntimeOrchestratorBuilder();
    const orchestrator = new RuntimeOrchestrator(builder.build());

    assert.throws(() => {
      (
        orchestrator as unknown as {
          _lifecycle: { transitionTo(state: RuntimeExecutionState): void };
        }
      )._lifecycle.transitionTo(RuntimeExecutionState.RUNNING);
    }, RuntimeExecutionStateError);
  });
});
