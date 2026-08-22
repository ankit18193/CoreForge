import * as assert from 'node:assert';
import { test } from 'node:test';

import { Container, ServiceLifetime, ServiceToken } from '@coreforge/container';
import { ActionArguments, Controller, EventBus, Logger } from '@coreforge/contracts';
import {
  ActionDescriptor,
  ControllerDescriptor,
  ControllerRegistry,
  ControllerState,
} from '@coreforge/controllers';
import { RequestScopeBuilder, RequestScopeFactory } from '@coreforge/request-scope';

import {
  ControllerResolutionError,
  ActionNotFoundError,
  ActionInvocationExecutionError,
} from '../errors/ActionInvokerErrors';
import { ActionInvoker } from '../invoker/ActionInvoker';
import { ActionInvokerBuilder } from '../invoker/ActionInvokerBuilder';

class DummyEventBus implements EventBus {
  public async publish() {}
  public subscribe() {
    return {};
  }
  public unsubscribe() {}
}

class TestController implements Controller {
  public syncAction(id: number): string {
    return `sync-${id}`;
  }

  public async asyncAction(id: number): Promise<string> {
    return Promise.resolve(`async-${id}`);
  }

  public voidAction(): void {
    // returns void
  }

  public nullAction(): null {
    return null;
  }

  public throwingAction(): void {
    throw new Error('Thrown from controller action');
  }
}

test('Action Invocation Engine Package', async (t) => {
  const rootContainer = new Container();
  const eventBus = new DummyEventBus();

  rootContainer.register({
    token: TestController as unknown as ServiceToken<TestController>,
    useClass: TestController,
    lifetime: ServiceLifetime.SCOPED,
  });

  const controllerRegistry = new ControllerRegistry();

  const dummyActions: ActionDescriptor[] = [
    {
      id: 'syncAction',
      metadata: {
        actionName: 'syncAction',
        displayName: 'sync',
        returnType: 'string',
        parameterCount: 1,
        tags: [],
        createdAt: Date.now(),
      },
      handler: ((c: TestController) => c.syncAction) as unknown as (...args: unknown[]) => unknown,
      parameterCount: 1,
      async: false,
      createdAt: Date.now(),
    },
    {
      id: 'asyncAction',
      metadata: {
        actionName: 'asyncAction',
        displayName: 'async',
        returnType: 'Promise<string>',
        parameterCount: 1,
        tags: [],
        createdAt: Date.now(),
      },
      handler: ((c: TestController) => c.asyncAction) as unknown as (...args: unknown[]) => unknown,
      parameterCount: 1,
      async: true,
      createdAt: Date.now(),
    },
    {
      id: 'voidAction',
      metadata: {
        actionName: 'voidAction',
        displayName: 'void',
        returnType: 'void',
        parameterCount: 0,
        tags: [],
        createdAt: Date.now(),
      },
      handler: ((c: TestController) => c.voidAction) as unknown as (...args: unknown[]) => unknown,
      parameterCount: 0,
      async: false,
      createdAt: Date.now(),
    },
    {
      id: 'nullAction',
      metadata: {
        actionName: 'nullAction',
        displayName: 'null',
        returnType: 'null',
        parameterCount: 0,
        tags: [],
        createdAt: Date.now(),
      },
      handler: ((c: TestController) => c.nullAction) as unknown as (...args: unknown[]) => unknown,
      parameterCount: 0,
      async: false,
      createdAt: Date.now(),
    },
    {
      id: 'throwingAction',
      metadata: {
        actionName: 'throwingAction',
        displayName: 'throwing',
        returnType: 'void',
        parameterCount: 0,
        tags: [],
        createdAt: Date.now(),
      },
      handler: ((c: TestController) => c.throwingAction) as unknown as (
        ...args: unknown[]
      ) => unknown,
      parameterCount: 0,
      async: false,
      createdAt: Date.now(),
    },
  ];

  const descriptor: ControllerDescriptor = {
    id: 'TestController',
    metadata: {
      id: 'TestController',
      name: 'TestController',
      version: '1.0.0',
      group: 'test',
      tags: [],
      createdAt: Date.now(),
    },
    instance: new TestController(),
    actions: dummyActions,
    state: ControllerState.READY,
    createdAt: Date.now(),
    enabled: true,
  };

  controllerRegistry.register(descriptor);

  const scopeBuilder = new RequestScopeBuilder().setRootContainer(rootContainer);
  const scopeFactory = new RequestScopeFactory(
    scopeBuilder.build(),
    eventBus as unknown as EventBus,
  );

  await t.test(
    'Controller Resolution - throws ControllerResolutionError on unregistered class',
    async () => {
      const scope = await scopeFactory.createScope();

      const unregisteredRegistry = new ControllerRegistry();
      class Unregistered implements Controller {}
      unregisteredRegistry.register({
        id: 'Unregistered',
        metadata: {
          id: 'Unregistered',
          name: 'Unregistered',
          version: '1',
          group: 'test',
          tags: [],
          createdAt: Date.now(),
        },
        instance: new Unregistered(),
        actions: [],
        state: ControllerState.READY,
        createdAt: Date.now(),
        enabled: true,
      });

      const badInvoker = new ActionInvoker(
        new ActionInvokerBuilder().setControllerRegistry(unregisteredRegistry).build(),
      );

      const args: ActionArguments = { positionals: [], named: {}, rawValues: {} };
      await assert.rejects(async () => {
        await badInvoker.invoke(new Unregistered(), 'someAction', args, scope);
      }, ControllerResolutionError);

      await scope.dispose();
    },
  );

  await t.test('Action Resolution - throws ActionNotFoundError on missing action', async () => {
    const invokerBuilder = new ActionInvokerBuilder().setControllerRegistry(controllerRegistry);
    const invoker = new ActionInvoker(invokerBuilder.build());

    const scope = await scopeFactory.createScope();
    const args: ActionArguments = { positionals: [], named: {}, rawValues: {} };

    await assert.rejects(async () => {
      await invoker.invoke(descriptor.instance, 'missingActionName', args, scope);
    }, ActionNotFoundError);

    await scope.dispose();
  });

  await t.test('Execution Normalization - sync and async and void outcomes', async () => {
    const invokerBuilder = new ActionInvokerBuilder().setControllerRegistry(controllerRegistry);
    const invoker = new ActionInvoker(invokerBuilder.build());

    const scope = await scopeFactory.createScope();

    const syncRes = await invoker.invoke(
      descriptor.instance,
      'syncAction',
      { positionals: [42], named: {}, rawValues: {} },
      scope,
    );
    assert.strictEqual(syncRes.value, 'sync-42');

    const asyncRes = await invoker.invoke(
      descriptor.instance,
      'asyncAction',
      { positionals: [100], named: {}, rawValues: {} },
      scope,
    );
    assert.strictEqual(asyncRes.value, 'async-100');

    const voidRes = await invoker.invoke(
      descriptor.instance,
      'voidAction',
      { positionals: [], named: {}, rawValues: {} },
      scope,
    );
    assert.strictEqual(voidRes.value, undefined);

    const nullRes = await invoker.invoke(
      descriptor.instance,
      'nullAction',
      { positionals: [], named: {}, rawValues: {} },
      scope,
    );
    assert.strictEqual(nullRes.value, null);

    await scope.dispose();
  });

  await t.test(
    'Exception Propagation - exceptions thrown by controller actions propagate',
    async () => {
      const invokerBuilder = new ActionInvokerBuilder().setControllerRegistry(controllerRegistry);
      const invoker = new ActionInvoker(invokerBuilder.build());

      const scope = await scopeFactory.createScope();
      const args: ActionArguments = { positionals: [], named: {}, rawValues: {} };

      await assert.rejects(async () => {
        await invoker.invoke(descriptor.instance, 'throwingAction', args, scope);
      }, ActionInvocationExecutionError);

      await scope.dispose();
    },
  );

  await t.test('Immutability - result and configurations are deeply frozen', async () => {
    const invokerBuilder = new ActionInvokerBuilder().setControllerRegistry(controllerRegistry);
    const config = invokerBuilder.build();
    const invoker = new ActionInvoker(config);

    const scope = await scopeFactory.createScope();
    const res = await invoker.invoke(
      descriptor.instance,
      'syncAction',
      { positionals: [1], named: {}, rawValues: {} },
      scope,
    );

    assert.throws(() => {
      (res as unknown as Record<string, unknown>).value = 'mutated';
    });

    assert.throws(() => {
      (config as unknown as Record<string, unknown>).logger = {} as unknown as Logger;
    });

    await scope.dispose();
  });

  await t.test('Diagnostics Snapshot - counts successes, average execution durations', async () => {
    const invokerBuilder = new ActionInvokerBuilder().setControllerRegistry(controllerRegistry);
    const invoker = new ActionInvoker(invokerBuilder.build());

    const scope = await scopeFactory.createScope();

    await invoker.invoke(
      descriptor.instance,
      'syncAction',
      { positionals: [1], named: {}, rawValues: {} },
      scope,
    );
    await invoker.invoke(
      descriptor.instance,
      'asyncAction',
      { positionals: [2], named: {}, rawValues: {} },
      scope,
    );

    const snap = invoker.diagnostics.getSnapshot();
    assert.strictEqual(snap.totalInvocations, 2);
    assert.strictEqual(snap.successfulInvocations, 2);
    assert.strictEqual(snap.failedInvocations, 0);

    await scope.dispose();
  });

  await t.test(
    'Stress Scale Test - 1000 parallel invocations work with isolated scopes',
    async () => {
      const invokerBuilder = new ActionInvokerBuilder().setControllerRegistry(controllerRegistry);
      const invoker = new ActionInvoker(invokerBuilder.build());

      const promises: Promise<void>[] = [];

      for (let i = 0; i < 1000; i++) {
        promises.push(
          scopeFactory.createScope().then(async (scope) => {
            const res = await invoker.invoke(
              descriptor.instance,
              'syncAction',
              { positionals: [i], named: {}, rawValues: {} },
              scope,
            );
            assert.strictEqual(res.value, `sync-${i}`);
            await scope.dispose();
          }),
        );
      }

      await Promise.all(promises);
    },
  );
});
