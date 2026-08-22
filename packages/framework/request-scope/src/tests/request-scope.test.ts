import * as assert from 'node:assert';
import { test } from 'node:test';

import { Container, ServiceLifetime } from '@coreforge/container';
import { Disposable, EventBus, Logger } from '@coreforge/contracts';

import { ScopeExecutionError, DisposalTimeoutError } from '../errors/ScopeErrors';
import { RequestScopeFactory } from '../factory/RequestScopeFactory';
import { ScopeState } from '../lifecycle/ScopeState';
import { RequestScope } from '../scope/RequestScope';
import { RequestScopeBuilder } from '../scope/RequestScopeBuilder';

class DummyLogger implements Logger {
  debug() {}
  info() {}
  warn() {}
  error() {}
  fatal() {}
}

class DummyEventBus implements EventBus {
  public readonly events: unknown[] = [];

  public async publish(event: unknown): Promise<void> {
    this.events.push(event);
  }

  public subscribe() {
    return {};
  }

  public unsubscribe() {}
}

class MockDisposable implements Disposable {
  public disposed = false;

  public async dispose(): Promise<void> {
    this.disposed = true;
  }
}

class HangingDisposable implements Disposable {
  public async dispose(): Promise<void> {
    await new Promise<void>(() => {});
  }
}

class ServiceC {}
class ServiceB {
  constructor(public readonly c: ServiceC) {}
}
class ServiceA {
  constructor(public readonly b: ServiceB) {}
}

test('Request Scope & Dependency Resolution Package', async (t) => {
  const rootContainer = new Container();
  const eventBus = new DummyEventBus();

  rootContainer.registerSingleton('Logger', DummyLogger);
  rootContainer.registerTransient('ServiceC', ServiceC);

  rootContainer.register({
    token: 'ServiceB',
    useClass: ServiceB,
    dependencies: ['ServiceC'],
    lifetime: ServiceLifetime.SCOPED,
  });

  rootContainer.register({
    token: 'ServiceA',
    useClass: ServiceA,
    dependencies: ['ServiceB'],
    lifetime: ServiceLifetime.SCOPED,
  });

  await t.test(
    'Scope Isolation - two concurrent scopes resolve different scoped instances but share singletons',
    async () => {
      const builder = new RequestScopeBuilder().setRootContainer(rootContainer);
      const factory = new RequestScopeFactory(builder.build(), eventBus);

      const scope1 = await factory.createScope();
      const scope2 = await factory.createScope();

      const a1 = scope1.resolve<ServiceA>('ServiceA');
      const a2 = scope2.resolve<ServiceA>('ServiceA');

      assert.ok(a1);
      assert.ok(a2);
      assert.notStrictEqual(a1, a2);

      const log1 = scope1.resolve<DummyLogger>('Logger');
      const log2 = scope2.resolve<DummyLogger>('Logger');
      assert.strictEqual(log1, log2);

      await scope1.dispose();
      await scope2.dispose();
    },
  );

  await t.test('Nested Scoped Resolution - service A -> B -> C', async () => {
    const builder = new RequestScopeBuilder().setRootContainer(rootContainer);
    const factory = new RequestScopeFactory(builder.build(), eventBus);

    const scope = await factory.createScope();

    const a = scope.resolve<ServiceA>('ServiceA');
    const b = scope.resolve<ServiceB>('ServiceB');

    assert.strictEqual(a.b, b);

    await scope.dispose();
  });

  await t.test('Disposal - disposable instances execute cleanup', async () => {
    const localContainer = new Container();
    localContainer.register({
      token: 'MockDisposable',
      useClass: MockDisposable,
      lifetime: ServiceLifetime.SCOPED,
    });

    const builder = new RequestScopeBuilder().setRootContainer(localContainer);
    const factory = new RequestScopeFactory(builder.build(), eventBus);

    const scope = await factory.createScope();
    const service = scope.resolve<MockDisposable>('MockDisposable');

    assert.strictEqual(service.disposed, false);

    await scope.dispose();
    assert.strictEqual(service.disposed, true);
    assert.strictEqual(scope.state, ScopeState.DISPOSED);
  });

  await t.test('Disposal Timeout - hanging service triggers DisposalTimeoutError', async () => {
    const localContainer = new Container();
    localContainer.register({
      token: 'HangingDisposable',
      useClass: HangingDisposable,
      lifetime: ServiceLifetime.SCOPED,
    });

    const builder = new RequestScopeBuilder()
      .setRootContainer(localContainer)
      .setDisposalTimeoutMs(50);

    const factory = new RequestScopeFactory(builder.build(), eventBus);
    const scope = await factory.createScope();
    scope.resolve('HangingDisposable');

    await assert.rejects(async () => {
      await scope.dispose();
    }, DisposalTimeoutError);

    assert.strictEqual(scope.state, ScopeState.FAILED);
  });

  await t.test('Memory Safety - disposed scope throws ScopeExecutionError on resolve', async () => {
    const builder = new RequestScopeBuilder().setRootContainer(rootContainer);
    const factory = new RequestScopeFactory(builder.build(), eventBus);

    const scope = await factory.createScope();
    await scope.dispose();

    assert.throws(() => {
      scope.resolve('ServiceA');
    }, ScopeExecutionError);
  });

  await t.test('Events publishing - created and disposed events are triggered', async () => {
    const bus = new DummyEventBus();
    const builder = new RequestScopeBuilder().setRootContainer(rootContainer);
    const factory = new RequestScopeFactory(builder.build(), bus);

    const scope = await factory.createScope('req-999', 'user-admin');
    await scope.dispose();

    const created = bus.events.find(
      (e) => (e as Record<string, unknown>).type === 'ScopeCreatedEvent',
    ) as unknown as Record<string, unknown>;
    const disposed = bus.events.find(
      (e) => (e as Record<string, unknown>).type === 'ScopeDisposedEvent',
    ) as unknown as Record<string, unknown>;

    assert.ok(created);
    assert.strictEqual(created.requestId, 'req-999');
    assert.ok(disposed);
  });

  await t.test('Stress scale test - 1000 scopes each with 10 scoped resolutions', async () => {
    const localContainer = new Container();
    for (let i = 0; i < 10; i++) {
      localContainer.register({
        token: `token-${i}`,
        useFactory: () => ({ index: i }),
        lifetime: ServiceLifetime.SCOPED,
      });
    }

    const builder = new RequestScopeBuilder().setRootContainer(localContainer);
    const factory = new RequestScopeFactory(builder.build(), eventBus);

    const scopes: RequestScope[] = [];
    const promises: Promise<void>[] = [];

    for (let i = 0; i < 1000; i++) {
      promises.push(
        factory.createScope().then(async (scope) => {
          scopes.push(scope);
          for (let j = 0; j < 10; j++) {
            const res = scope.resolve<{ index: number }>(`token-${j}`);
            assert.strictEqual(res.index, j);
          }
          await scope.dispose();
        }),
      );
    }

    await Promise.all(promises);
    assert.strictEqual(builder.diagnostics.getSnapshot().scopesCreated, 1000);
    assert.strictEqual(builder.diagnostics.getSnapshot().scopesDisposed, 1000);
  });
});
