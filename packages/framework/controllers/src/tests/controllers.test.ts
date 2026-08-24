import * as assert from 'node:assert';
import { test } from 'node:test';

import {
  Container,
  Controller,
  DomainEvent,
  EventBus,
  EventDispatchResult,
  Logger,
} from '@coreforge/contracts';

import { ControllerBuilder } from '../controller/ControllerBuilder';
import { ControllerFactory } from '../controller/ControllerFactory';
import { ControllerManager } from '../controller/ControllerManager';
import {
  ActionNotFoundError,
  ControllerStateError,
  DuplicateControllerError,
} from '../errors/ControllerErrors';
import { ControllerContext } from '../executor/ControllerContext';
import { ControllerState } from '../lifecycle/ControllerState';

class DummyLogger implements Logger {
  trace() {}
  debug() {}
  info() {}
  warn() {}
  error() {}
  fatal() {}
  child() {
    return this;
  }
}

class DummyEventBus implements EventBus {
  async emit<T extends DomainEvent>(event: T): Promise<EventDispatchResult> {
    return {
      eventId: event.id,
      eventType: event.type,
      handlerCount: 0,
      successfulHandlers: 0,
      failedHandlers: 0,
      cancelled: false,
      durationMs: 0,
    };
  }
  subscribe() {
    return { id: 'sub-1', eventType: '', unsubscribe: () => {} };
  }
}

class DummyContainer implements Container {
  resolve<T>(): T {
    return {} as T;
  }
  has() {
    return true;
  }
}

class TestController implements Controller {
  public getSync() {
    return 'sync-value';
  }

  public async getAsync(val: string) {
    return Promise.resolve(`async-${val}`);
  }
}

class ParameterizedController implements Controller {
  private readonly _dep: string;
  constructor(dep: string) {
    this._dep = dep;
  }
  public getDep() {
    return this._dep;
  }
}

test('Controller System Framework Package', async (t) => {
  const container = new DummyContainer();
  const logger = new DummyLogger();
  const eventBus = new DummyEventBus();

  const createContext = () => {
    return new ControllerContext({
      request: { method: 'GET', url: '/users' },
      response: { status: 200 },
      route: { path: '/users' },
      logger,
      eventBus,
      container,
      parameters: { id: '42' },
      requestId: 'req-123',
    });
  };

  await t.test('ControllerFactory integration', async () => {
    const factory = new ControllerFactory();
    const inst = factory.create(TestController);
    assert.ok(inst instanceof TestController);

    assert.throws(() => {
      factory.create(ParameterizedController);
    }, ControllerStateError);
  });

  await t.test('ControllerBuilder validation', async () => {
    const builder = new ControllerBuilder();
    builder.configureDefaultVersion('v2');
    assert.throws(() => {
      builder.configureDefaultVersion('v3');
    }, ControllerStateError);

    const config = builder.build();
    assert.strictEqual(config.defaultVersion, 'v2');
    assert.throws(() => {
      (config as unknown as Record<string, unknown>).defaultVersion = 'v3';
    });
  });

  await t.test('Discovery, Metadata Verification and Registration', async () => {
    const factory = new ControllerFactory();
    const manager = new ControllerManager(factory);

    assert.strictEqual(manager.state, ControllerState.CREATED);
    manager.startRegistration();
    assert.strictEqual(manager.state, ControllerState.REGISTERING);

    const id = manager.register(TestController, {
      name: 'Test',
      version: 'v2',
      group: 'users',
      tags: ['auth', 'admin'],
    });

    assert.ok(id);
    const descriptor = manager.registry.get(id);
    assert.ok(descriptor);

    assert.throws(() => {
      (descriptor as unknown as Record<string, unknown>).enabled = false;
    });

    assert.strictEqual(descriptor.metadata.name, 'Test');
    assert.strictEqual(descriptor.metadata.version, 'v2');
    assert.strictEqual(descriptor.metadata.group, 'users');
    assert.deepStrictEqual(descriptor.metadata.tags, ['auth', 'admin']);

    assert.strictEqual(descriptor.actions.length, 2);
    const syncAction = descriptor.actions.find((a) => a.metadata.actionName === 'getSync');
    assert.ok(syncAction);
    assert.strictEqual(syncAction.async, false);
    assert.strictEqual(syncAction.parameterCount, 0);

    const asyncAction = descriptor.actions.find((a) => a.metadata.actionName === 'getAsync');
    assert.ok(asyncAction);
    assert.strictEqual(asyncAction.async, true);
    assert.strictEqual(asyncAction.parameterCount, 1);

    assert.throws(() => {
      manager.register(TestController, { name: 'Test' });
    }, DuplicateControllerError);

    manager.completeRegistration();
    assert.strictEqual(manager.state, ControllerState.READY);

    assert.throws(() => {
      manager.register(TestController);
    }, ControllerStateError);
  });

  await t.test('Sync & Async execution and Context immutability', async () => {
    const factory = new ControllerFactory();
    const manager = new ControllerManager(factory);
    manager.startRegistration();
    const id = manager.register(TestController, { name: 'Test' });
    manager.completeRegistration();

    const desc = manager.registry.get(id)!;
    const context = createContext();

    assert.throws(() => {
      (context.request as unknown as Record<string, unknown>).method = 'POST';
    });

    context.response.status = 201;
    assert.strictEqual(context.response.status, 201);

    const syncVal = await manager.execute(desc.instance, 'getSync', context);
    assert.strictEqual(syncVal, 'sync-value');

    const asyncVal = await manager.execute(desc.instance, 'getAsync', context, ['hello']);
    assert.strictEqual(asyncVal, 'async-hello');

    await assert.rejects(async () => {
      await manager.execute(desc.instance, 'missingAction', context);
    }, ActionNotFoundError);
  });

  await t.test('Diagnostics Snapshot tracking metrics', async () => {
    const factory = new ControllerFactory();
    const manager = new ControllerManager(factory);
    manager.startRegistration();
    const id = manager.register(TestController, { name: 'Test' });
    manager.completeRegistration();

    const desc = manager.registry.get(id)!;
    const context = createContext();

    await manager.execute(desc.instance, 'getSync', context);
    await manager.execute(desc.instance, 'getAsync', context, ['world']);

    const snapshot = manager.diagnostics.getSnapshot();
    assert.strictEqual(snapshot.totalControllers, 1);
    assert.strictEqual(snapshot.totalActions, 2);
    assert.strictEqual(snapshot.executionCount, 2);
    assert.strictEqual(snapshot.successfulExecutions, 2);
    assert.strictEqual(snapshot.failedExecutions, 0);
  });

  await t.test('Stress Scale Test - 10,000 controllers registration & execution', async () => {
    const factory = new ControllerFactory();
    const manager = new ControllerManager(factory);
    manager.startRegistration();

    class DynamicController implements Controller {
      public index() {
        return 'ok';
      }
    }

    for (let i = 0; i < 10000; i++) {
      manager.register(DynamicController, {
        id: `ctrl-${i}`,
        name: `DynamicController-${i}`,
      });
    }

    manager.completeRegistration();
    const snapshot = manager.diagnostics.getSnapshot();
    assert.strictEqual(snapshot.totalControllers, 10000);
    assert.strictEqual(snapshot.totalActions, 10000);

    const context = createContext();
    const target = manager.registry.get('ctrl-5000')!;
    const val = await manager.execute(target.instance, 'index', context);
    assert.strictEqual(val, 'ok');
  });
});
