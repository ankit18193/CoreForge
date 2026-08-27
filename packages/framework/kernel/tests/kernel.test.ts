import * as assert from 'node:assert';
import { test } from 'node:test';

import {
  KernelComponent,
  KernelComponentRegistry,
  KernelComponentResolver,
  KernelDependencyError,
  KernelRegistrationError,
} from '../src/index';

test('CoreForge Application Kernel & Lifecycle Coordination Engine (@coreforge/kernel) - Stage 1', async (t) => {
  await t.test('1. Component Registration: Validates IDs, duplicate rejection, and size', () => {
    const registry = new KernelComponentRegistry();

    const compA: KernelComponent = {
      id: 'comp_a',
      start() {},
      stop() {},
      ready: true,
    };

    const compB: KernelComponent = {
      id: 'comp_b',
      start() {},
      stop() {},
      ready: true,
    };

    registry.register(compA);
    registry.register(compB, { name: 'Component B' });

    assert.strictEqual(registry.size, 2);
    assert.strictEqual(registry.has('comp_a'), true);
    assert.strictEqual(registry.has('comp_b'), true);
    assert.strictEqual(registry.has('comp_c'), false);

    assert.throws(
      () => registry.register(compA),
      (err: Error) => err instanceof KernelRegistrationError,
    );
  });

  await t.test('2. Registration Lock: Rejects registrations after lock()', () => {
    const registry = new KernelComponentRegistry();
    registry.register({
      id: 'comp_1',
      start() {},
      stop() {},
      ready: true,
    });

    registry.lock();

    assert.throws(
      () =>
        registry.register({
          id: 'comp_2',
          start() {},
          stop() {},
          ready: true,
        }),
      (err: Error) => err instanceof KernelRegistrationError,
    );
  });

  await t.test('3. Dependency Ordering: Deterministic topological resolution', () => {
    const registry = new KernelComponentRegistry();

    const compContext: KernelComponent = {
      id: 'context',
      start() {},
      stop() {},
      ready: true,
    };

    const compExecution: KernelComponent = {
      id: 'execution',
      dependencies: ['context'],
      start() {},
      stop() {},
      ready: true,
    };

    const compDispatch: KernelComponent = {
      id: 'dispatch',
      dependencies: ['execution'],
      start() {},
      stop() {},
      ready: true,
    };

    const compApp: KernelComponent = {
      id: 'application',
      dependencies: ['dispatch'],
      start() {},
      stop() {},
      ready: true,
    };

    registry.register(compApp);
    registry.register(compDispatch);
    registry.register(compExecution);
    registry.register(compContext);

    const startupOrder = KernelComponentResolver.resolveStartupOrder(registry);
    assert.strictEqual(startupOrder.length, 4);
    assert.strictEqual(startupOrder[0].id, 'context');
    assert.strictEqual(startupOrder[1].id, 'execution');
    assert.strictEqual(startupOrder[2].id, 'dispatch');
    assert.strictEqual(startupOrder[3].id, 'application');

    const shutdownOrder = KernelComponentResolver.resolveShutdownOrder(registry);
    assert.strictEqual(shutdownOrder.length, 4);
    assert.strictEqual(shutdownOrder[0].id, 'application');
    assert.strictEqual(shutdownOrder[1].id, 'dispatch');
    assert.strictEqual(shutdownOrder[2].id, 'execution');
    assert.strictEqual(shutdownOrder[3].id, 'context');
  });

  await t.test('4. Missing Dependency Detection: Throws KernelDependencyError', () => {
    const registry = new KernelComponentRegistry();

    registry.register({
      id: 'consumer',
      dependencies: ['missing_service'],
      start() {},
      stop() {},
      ready: true,
    });

    assert.throws(
      () => KernelComponentResolver.resolveStartupOrder(registry),
      (err: Error) => err instanceof KernelDependencyError,
    );
  });

  await t.test('5. Dependency Cycle Detection: Throws KernelDependencyError', () => {
    const registry = new KernelComponentRegistry();

    registry.register({
      id: 'comp_a',
      dependencies: ['comp_b'],
      start() {},
      stop() {},
      ready: true,
    });

    registry.register({
      id: 'comp_b',
      dependencies: ['comp_c'],
      start() {},
      stop() {},
      ready: true,
    });

    registry.register({
      id: 'comp_c',
      dependencies: ['comp_a'],
      start() {},
      stop() {},
      ready: true,
    });

    assert.throws(
      () => KernelComponentResolver.resolveStartupOrder(registry),
      (err: Error) => err instanceof KernelDependencyError,
    );
  });
});
