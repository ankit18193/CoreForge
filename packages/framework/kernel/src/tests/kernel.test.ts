import * as assert from 'node:assert';
import { test } from 'node:test';

import {
  KernelInitializationError,
  KernelStateError,
} from '../errors/KernelErrors';
import { FrameworkKernel } from '../kernel/FrameworkKernel';
import { KernelBuilder } from '../kernel/KernelBuilder';
import { KernelState } from '../lifecycle/KernelState';

test('Framework Kernel Package', async (t) => {
  const getMockSubsystems = (
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> => {
    const list = [
      'Bootstrap',
      'Runtime',
      'HttpServer',
      'Router',
      'Middleware',
      'Controllers',
      'RequestHandler',
      'Binding',
      'RequestScope',
      'ActionInvoker',
      'Serialization',
      'Security',
      'Interceptors',
      'Metadata',
      'Discovery',
      'Compiler',
      'Scanner',
      'Assembly',
      'Initialization',
      'Orchestrator',
      'Extensions',
      'Plugins',
    ];
    const res: Record<string, unknown> = {};
    for (const name of list) {
      res[name] = overrides[name] !== undefined ? overrides[name] : { name };
    }
    return res;
  };

  await t.test(
    'Successful integration and deterministic startup snapshot',
    async () => {
      const builder = new KernelBuilder();
      const kernel = new FrameworkKernel(builder.build());

      assert.strictEqual(kernel.state, KernelState.CREATED);

      const subsystems = getMockSubsystems();
      const snapshot = await kernel.initialize(subsystems);

      assert.strictEqual(kernel.state, KernelState.READY);
      assert.strictEqual(snapshot.initialized, true);
      assert.strictEqual(snapshot.version, '1.0.0');
      assert.strictEqual(snapshot.subsystemCount, 22);

      assert.ok(kernel.registry.has('Bootstrap'));
      assert.ok(kernel.registry.has('Plugins'));

      assert.throws(() => {
        kernel.registry.register('NewSubsystem', {});
      });

      assert.throws(() => {
        (snapshot as unknown as { initialized: boolean }).initialized = false;
      });

      const snap = kernel.diagnostics.getSnapshot();
      assert.strictEqual(snap.integratedPackageCount, 22);
      assert.strictEqual(snap.registeredSubsystemCount, 22);
      assert.strictEqual(snap.validationFailures, 0);
    },
  );

  await t.test('Duplicate subsystem registrations are rejected', () => {
    const builder = new KernelBuilder();
    const kernel = new FrameworkKernel(builder.build());

    kernel.registry.register('Sub-1', {});
    assert.throws(() => {
      kernel.registry.register('Sub-1', {});
    });
  });

  await t.test('Missing subsystems throw validation errors', async () => {
    const builder = new KernelBuilder();
    const kernel = new FrameworkKernel(builder.build());

    const subsystems = getMockSubsystems();
    delete subsystems.Plugins;

    await assert.rejects(async () => {
      await kernel.initialize(subsystems);
    }, KernelInitializationError);

    assert.strictEqual(kernel.state, KernelState.FAILED);
  });

  await t.test('Parallel initialize() calls are rejected safely', async () => {
    const builder = new KernelBuilder();
    const kernel = new FrameworkKernel(builder.build());

    const subsystems = getMockSubsystems();
    const p1 = kernel.initialize(subsystems);

    await assert.rejects(async () => {
      await kernel.initialize(subsystems);
    }, KernelStateError);

    await p1;
  });

  await t.test('Invalid lifecycle state transitions throw errors', () => {
    const builder = new KernelBuilder();
    const kernel = new FrameworkKernel(builder.build());

    assert.throws(() => {
      (
        kernel as unknown as {
          _lifecycle: { transitionTo(state: KernelState): void };
        }
      )._lifecycle.transitionTo(KernelState.READY);
    }, KernelStateError);
  });
});
