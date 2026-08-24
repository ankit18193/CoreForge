import * as assert from 'node:assert';
import { test } from 'node:test';

import {
  Container,
  DomainEvent,
  EventBus,
  EventDispatchResult,
  EventHandler,
  EventSubscription,
} from '@coreforge/contracts';

import { ApplicationBuilder } from '../application/ApplicationBuilder';
import { ApplicationStateError, ApplicationValidationError } from '../errors/ApplicationErrors';
import { KernelState } from '../kernel/KernelState';
import { StartupStep } from '../lifecycle/StartupCoordinator';

class DummyContainer implements Container {
  public resolve<T>(_token: unknown): T {
    return {} as unknown as T;
  }

  public has(_token: unknown): boolean {
    return true;
  }
}

class MockEventBus implements EventBus {
  public readonly publishedEvents: unknown[] = [];
  private readonly _handlers = new Map<string, EventHandler[]>();

  public async emit<T extends DomainEvent>(event: T): Promise<EventDispatchResult> {
    this.publishedEvents.push(event);
    const list = this._handlers.get(event.type) || [];
    for (const handler of list) {
      await handler(event, { event });
    }
    return {
      eventId: event.id,
      eventType: event.type,
      handlerCount: list.length,
      successfulHandlers: list.length,
      failedHandlers: 0,
      cancelled: false,
      durationMs: 0,
    };
  }

  public subscribe<T extends DomainEvent>(
    eventType: string,
    handler: EventHandler<T>,
  ): EventSubscription {
    const list = this._handlers.get(eventType) || [];
    list.push(handler as unknown as EventHandler);
    this._handlers.set(eventType, list);
    return {
      id: 'sub-1',
      eventType,
      unsubscribe: () => {
        const current = this._handlers.get(eventType) || [];
        this._handlers.set(
          eventType,
          current.filter((h) => h !== (handler as unknown as EventHandler)),
        );
      },
    };
  }
}

class MockStep implements StartupStep {
  public readonly name: string;
  private readonly _sequence: string[];

  constructor(name: string, sequence: string[]) {
    this.name = name;
    this._sequence = sequence;
  }

  public async start(): Promise<void> {
    this._sequence.push(`start-${this.name}`);
  }

  public async stop(): Promise<void> {
    this._sequence.push(`stop-${this.name}`);
  }
}

class ThrowingStep implements StartupStep {
  public readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  public async start(): Promise<void> {
    throw new Error(`Step ${this.name} failed during startup`);
  }

  public async stop(): Promise<void> {}
}

test('Application Kernel Package', async (t) => {
  await t.test('Builder creates a valid Application & validates DI', async () => {
    const builder = new ApplicationBuilder();
    assert.throws(() => {
      builder.build();
    }, ApplicationValidationError);

    builder.setContainer(new DummyContainer()).setApplicationId('AppTest').setEnvironment('test');
    const app = builder.build();
    assert.ok(app);
    assert.strictEqual(app.state, KernelState.INITIALIZED);
  });

  await t.test('Startup & Shutdown sequence executes in correct onion order', async () => {
    const sequence: string[] = [];
    const bus = new MockEventBus();
    const builder = new ApplicationBuilder()
      .setContainer(new DummyContainer())
      .setApplicationId('AppTest')
      .registerComponent('EventBus', 'EventBus', bus)
      .registerStep(new MockStep('Bootstrap', sequence))
      .registerStep(new MockStep('Runtime', sequence))
      .registerStep(new MockStep('HttpServer', sequence));

    const app = builder.build();
    await app.start();

    assert.deepStrictEqual(sequence, ['start-Bootstrap', 'start-Runtime', 'start-HttpServer']);
    assert.strictEqual(app.state, KernelState.RUNNING);

    await app.stop();
    assert.deepStrictEqual(sequence, [
      'start-Bootstrap',
      'start-Runtime',
      'start-HttpServer',
      'stop-HttpServer',
      'stop-Runtime',
      'stop-Bootstrap',
    ]);
    assert.strictEqual(app.state, KernelState.STOPPED);
  });

  await t.test('Startup Failure Rollback in exact reverse order', async () => {
    const sequence: string[] = [];
    const builder = new ApplicationBuilder()
      .setContainer(new DummyContainer())
      .setApplicationId('AppTest')
      .registerStep(new MockStep('Bootstrap', sequence))
      .registerStep(new MockStep('Runtime', sequence))
      .registerStep(new ThrowingStep('HttpServer'));

    const app = builder.build();
    await assert.rejects(async () => {
      await app.start();
    });

    assert.deepStrictEqual(sequence, [
      'start-Bootstrap',
      'start-Runtime',
      'stop-Runtime',
      'stop-Bootstrap',
    ]);
    assert.strictEqual(app.state, KernelState.FAILED);
  });

  await t.test('Lifecycle Events published correctly on EventBus', async () => {
    const bus = new MockEventBus();
    const builder = new ApplicationBuilder()
      .setContainer(new DummyContainer())
      .setApplicationId('AppTest')
      .registerComponent('EventBus', 'EventBus', bus);

    const app = builder.build();
    await app.start();
    await app.stop();

    const names = bus.publishedEvents.map((e) => (e as { name: string }).name);
    assert.ok(names.includes('ApplicationStartedEvent'));
    assert.ok(names.includes('ApplicationStoppingEvent'));
    assert.ok(names.includes('ApplicationStoppedEvent'));
  });

  await t.test('Diagnostics & Health Snapshot evaluates subsystem values', async () => {
    const builder = new ApplicationBuilder()
      .setContainer(new DummyContainer())
      .setApplicationId('AppTest')
      .registerRoute('/user')
      .registerModule('MainModule')
      .registerController('UserController')
      .registerSerializer('JSONSerializer')
      .registerInterceptor('LogInterceptor')
      .registerAuthProvider('JWTProvider')
      .registerEvent('UserRegisteredEvent')
      .registerService('UserService');

    const app = builder.build();
    await app.start();

    const diag = app.diagnostics.getSnapshot();
    assert.strictEqual(diag.applicationId, 'AppTest');
    assert.strictEqual(diag.registry.totalRoutes, 1);
    assert.strictEqual(diag.registry.totalModules, 1);
    assert.strictEqual(diag.registry.totalControllers, 1);
    assert.strictEqual(diag.registry.totalInterceptors, 1);
    assert.strictEqual(diag.registry.totalSerializers, 1);
    assert.strictEqual(diag.registry.totalAuthProviders, 1);
    assert.strictEqual(diag.registry.totalEvents, 1);
    assert.strictEqual(diag.registry.totalServices, 1);

    const health = app.diagnostics.getHealthSnapshot();
    assert.strictEqual(health.status, 'HEALTHY');
    assert.strictEqual(health.modules.registeredCount, 1);
    assert.deepStrictEqual(health.modules.names, ['MainModule']);
  });

  await t.test('Double start and double stop states handles safely', async () => {
    const builder = new ApplicationBuilder()
      .setContainer(new DummyContainer())
      .setApplicationId('AppTest');
    const app = builder.build();

    await app.start();
    await app.start();
    assert.strictEqual(app.state, KernelState.RUNNING);

    await app.stop();
    await app.stop();
    assert.strictEqual(app.state, KernelState.STOPPED);
  });

  await t.test('Enforce state transition rule jumps', async () => {
    const builder = new ApplicationBuilder()
      .setContainer(new DummyContainer())
      .setApplicationId('AppTest');
    const app = builder.build();

    assert.throws(() => {
      (
        (app as unknown as Record<string, unknown>)._kernel as {
          transitionTo(state: KernelState): void;
        }
      ).transitionTo(KernelState.STOPPED);
    }, ApplicationStateError);
  });

  await t.test('Registry Immutability prevents post-build mutations', async () => {
    const builder = new ApplicationBuilder()
      .setContainer(new DummyContainer())
      .setApplicationId('AppTest')
      .registerRoute('/route');

    const app = builder.build();
    assert.throws(() => {
      (
        (app as unknown as Record<string, unknown>)._kernel as {
          registry: { registerRoute(path: string): void };
        }
      ).registry.registerRoute('/new');
    });
  });
});
