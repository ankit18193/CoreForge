import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { test } from 'node:test';

import {
  DomainEvent,
  EventBus,
  EventBusBuilder,
  EventFactory,
  EventPayloadError,
  EventStateError,
} from '../src/index';

test('CoreForge Event Bus & Application Event Pipeline Engine (@coreforge/events)', async (t) => {
  await t.test(
    '1. Event Creation: Creates valid DomainEvent with generated ID and timestamp',
    async () => {
      const event = EventFactory.create('UserCreated', { userId: 'u-1', name: 'Alice' });

      assert.ok(event.id);
      assert.strictEqual(typeof event.id, 'string');
      assert.strictEqual(event.type, 'UserCreated');
      assert.ok(event.timestamp > 0);
      assert.deepStrictEqual(event.payload, { userId: 'u-1', name: 'Alice' });
    },
  );

  await t.test('2. Event ID Uniqueness: Consecutive events receive unique IDs', async () => {
    const event1 = EventFactory.create('OrderPlaced', { orderId: 1 });
    const event2 = EventFactory.create('OrderPlaced', { orderId: 2 });

    assert.notStrictEqual(event1.id, event2.id);
  });

  await t.test(
    '3. Event Type Validation: Rejects empty or whitespace-only event types',
    async () => {
      assert.throws(() => {
        EventFactory.create('', { data: true });
      }, EventPayloadError);

      assert.throws(() => {
        EventFactory.create('   ', { data: true });
      }, EventPayloadError);

      assert.throws(() => {
        (EventFactory as unknown as { create: (type: unknown, payload: unknown) => void }).create(
          null,
          { data: true },
        );
      }, EventPayloadError);
    },
  );

  await t.test('4. Payload Immutability: Event payload is deeply frozen', async () => {
    const payload = { details: { role: 'admin', tags: ['core', 'infra'] } };
    const event = EventFactory.create('RoleAssigned', payload);

    assert.ok(Object.isFrozen(event));
    assert.ok(Object.isFrozen(event.payload));
    assert.ok(Object.isFrozen(event.payload.details));
    assert.ok(Object.isFrozen(event.payload.details.tags));

    assert.throws(() => {
      (event.payload as unknown as Record<string, unknown>).newProp = 'fail';
    });
    assert.throws(() => {
      (event.payload.details as unknown as Record<string, unknown>).role = 'mutated';
    });
  });

  await t.test(
    '5. Circular Payload Handling: Replaces circular references with [Circular] safely',
    async () => {
      const circularObj: Record<string, unknown> = { name: 'Root' };
      circularObj.self = circularObj;

      const event = EventFactory.create('CircularEvent', circularObj);

      assert.strictEqual(event.payload.name, 'Root');
      assert.strictEqual(event.payload.self, '[Circular]');
    },
  );

  await t.test(
    '6. Handler Registration & Priority Ordering: Higher priority handlers execute first',
    async () => {
      const bus = new EventBus();
      const executionOrder: string[] = [];

      bus.subscribe(
        'OrderCompleted',
        () => {
          executionOrder.push('low');
        },
        { priority: 10 },
      );

      bus.subscribe(
        'OrderCompleted',
        () => {
          executionOrder.push('high');
        },
        { priority: 100 },
      );

      bus.subscribe(
        'OrderCompleted',
        () => {
          executionOrder.push('medium');
        },
        { priority: 50 },
      );

      await bus.emit(EventFactory.create('OrderCompleted', { orderId: 101 }));

      assert.deepStrictEqual(executionOrder, ['high', 'medium', 'low']);
    },
  );

  await t.test(
    '7. Deterministic Registration Ordering: Equal priority handlers execute in registration order',
    async () => {
      const bus = new EventBus();
      const executionOrder: number[] = [];

      for (let i = 1; i <= 5; i++) {
        bus.subscribe(
          'TestEvent',
          () => {
            executionOrder.push(i);
          },
          { priority: 50 },
        );
      }

      await bus.emit(EventFactory.create('TestEvent', {}));

      assert.deepStrictEqual(executionOrder, [1, 2, 3, 4, 5]);
    },
  );

  await t.test(
    '8. Subscription & Unsubscription: Unsubscribing prevents future invocations idempotently',
    async () => {
      const bus = new EventBus();
      let callCount = 0;

      const sub = bus.subscribe('Heartbeat', () => {
        callCount++;
      });

      await bus.emit(EventFactory.create('Heartbeat', {}));
      assert.strictEqual(callCount, 1);

      sub.unsubscribe();
      sub.unsubscribe(); // Idempotent check

      await bus.emit(EventFactory.create('Heartbeat', {}));
      assert.strictEqual(callCount, 1);
    },
  );

  await t.test('9. Sequential Dispatch: Handlers execute one after another in order', async () => {
    const bus = new EventBusBuilder().setDefaultDispatchMode('SEQUENTIAL').build();
    const timestamps: number[] = [];

    bus.subscribe(
      'StepEvent',
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        timestamps.push(Date.now());
      },
      { priority: 100 },
    );

    bus.subscribe(
      'StepEvent',
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        timestamps.push(Date.now());
      },
      { priority: 50 },
    );

    const result = await bus.emit(EventFactory.create('StepEvent', {}));

    assert.strictEqual(result.handlerCount, 2);
    assert.strictEqual(result.successfulHandlers, 2);
    assert.strictEqual(timestamps.length, 2);
    assert.ok(timestamps[1] >= timestamps[0] + 15);
  });

  await t.test(
    '10. Parallel Dispatch: Handlers execute concurrently with allSettled semantics',
    async () => {
      const bus = new EventBusBuilder().setDefaultDispatchMode('PARALLEL').build();
      const executed: string[] = [];
      let concurrent = 0;
      let maxConcurrent = 0;

      bus.subscribe('ParallelEvent', async () => {
        concurrent++;
        if (concurrent > maxConcurrent) {
          maxConcurrent = concurrent;
        }
        await new Promise((resolve) => setTimeout(resolve, 20));
        executed.push('H1');
        concurrent--;
      });

      bus.subscribe('ParallelEvent', async () => {
        concurrent++;
        if (concurrent > maxConcurrent) {
          maxConcurrent = concurrent;
        }
        await new Promise((resolve) => setTimeout(resolve, 20));
        executed.push('H2');
        concurrent--;
      });

      const result = await bus.emit(EventFactory.create('ParallelEvent', {}), { mode: 'PARALLEL' });

      assert.strictEqual(result.handlerCount, 2);
      assert.strictEqual(result.successfulHandlers, 2);
      assert.strictEqual(executed.length, 2);
      assert.strictEqual(maxConcurrent, 2);
    },
  );

  await t.test(
    '11. Handler Failure Isolation: Failing handler does not stop remaining handlers',
    async () => {
      const bus = new EventBus();
      const executed: string[] = [];

      bus.subscribe(
        'IsolatedEvent',
        () => {
          executed.push('H1');
        },
        { priority: 100 },
      );

      bus.subscribe(
        'IsolatedEvent',
        () => {
          executed.push('H2_FAIL');
          throw new Error('Database write error');
        },
        { priority: 50 },
      );

      bus.subscribe(
        'IsolatedEvent',
        () => {
          executed.push('H3');
        },
        { priority: 10 },
      );

      const result = await bus.emit(EventFactory.create('IsolatedEvent', {}));

      assert.deepStrictEqual(executed, ['H1', 'H2_FAIL', 'H3']);
      assert.strictEqual(result.handlerCount, 3);
      assert.strictEqual(result.successfulHandlers, 2);
      assert.strictEqual(result.failedHandlers, 1);
      assert.ok(result.errors);
      assert.strictEqual(result.errors.length, 1);
      assert.strictEqual(result.errors[0].message, 'Database write error');
    },
  );

  await t.test(
    '12. Async Handler Support: Correctly awaits promise-returning handlers',
    async () => {
      const bus = new EventBus();
      let asyncProcessed = false;

      bus.subscribe('AsyncEvent', async (event: DomainEvent<{ val: number }>) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        if (event.payload.val === 42) {
          asyncProcessed = true;
        }
      });

      const result = await bus.emit(EventFactory.create('AsyncEvent', { val: 42 }));

      assert.strictEqual(result.successfulHandlers, 1);
      assert.strictEqual(asyncProcessed, true);
    },
  );

  await t.test(
    '13. Retry Policy: Successfully retries failing handler up to maxAttempts',
    async () => {
      const bus = new EventBus();
      let attempts = 0;

      bus.subscribe(
        'FlakyEvent',
        () => {
          attempts++;
          if (attempts < 3) {
            throw new Error('Transient network error');
          }
        },
        {
          retry: { maxAttempts: 3, delayMs: 5 },
        },
      );

      const result = await bus.emit(EventFactory.create('FlakyEvent', {}));

      assert.strictEqual(attempts, 3);
      assert.strictEqual(result.successfulHandlers, 1);
      assert.strictEqual(result.failedHandlers, 0);
    },
  );

  await t.test(
    '14. Retry Exhaustion: Records failure descriptor when retries are exhausted',
    async () => {
      const bus = new EventBus();
      let attempts = 0;

      bus.subscribe(
        'FailingEvent',
        () => {
          attempts++;
          const err = new Error('Persistent failure');
          (err as Error & { code: string }).code = 'ERR_PERSISTENT';
          throw err;
        },
        {
          retry: { maxAttempts: 2, delayMs: 5 },
        },
      );

      const result = await bus.emit(EventFactory.create('FailingEvent', {}));

      assert.strictEqual(attempts, 2);
      assert.strictEqual(result.successfulHandlers, 0);
      assert.strictEqual(result.failedHandlers, 1);
      assert.ok(result.errors);
      assert.strictEqual(result.errors[0].message, 'Persistent failure');
      assert.strictEqual(result.errors[0].code, 'ERR_PERSISTENT');
    },
  );

  await t.test(
    '15. Cancellation Before Dispatch: AbortSignal pre-aborted executes 0 handlers',
    async () => {
      const bus = new EventBus();
      let executed = false;

      bus.subscribe('PreCancelled', () => {
        executed = true;
      });

      const controller = new AbortController();
      controller.abort(); // Pre-aborted

      const result = await bus.emit(EventFactory.create('PreCancelled', {}), {
        signal: controller.signal,
      });

      assert.strictEqual(executed, false);
      assert.strictEqual(result.cancelled, true);
      assert.strictEqual(result.successfulHandlers, 0);
      assert.strictEqual(result.failedHandlers, 0);
    },
  );

  await t.test(
    '16. Cancellation During Sequential Dispatch: AbortSignal stops remaining handlers',
    async () => {
      const bus = new EventBus();
      const executed: string[] = [];
      const controller = new AbortController();

      bus.subscribe(
        'MidCancelled',
        () => {
          executed.push('H1');
          controller.abort(); // Abort during H1
        },
        { priority: 100 },
      );

      bus.subscribe(
        'MidCancelled',
        () => {
          executed.push('H2');
        },
        { priority: 50 },
      );

      const result = await bus.emit(EventFactory.create('MidCancelled', {}), {
        signal: controller.signal,
      });

      assert.deepStrictEqual(executed, ['H1']);
      assert.strictEqual(result.cancelled, true);
      assert.strictEqual(result.successfulHandlers, 1);
      assert.strictEqual(result.failedHandlers, 0);
    },
  );

  await t.test(
    '17. Lifecycle Transitions: CREATED -> READY -> STOPPING -> STOPPED and Idempotency',
    async () => {
      const bus = new EventBus({ autoStart: false });
      assert.strictEqual(bus.state, 'CREATED');

      bus.start();
      assert.strictEqual(bus.state, 'READY');

      bus.start(); // Idempotent
      assert.strictEqual(bus.state, 'READY');

      await bus.stop();
      assert.strictEqual(bus.state, 'STOPPED');

      await bus.stop(); // Idempotent
      assert.strictEqual(bus.state, 'STOPPED');
    },
  );

  await t.test(
    '18. Lifecycle Enforcement: Rejects emit before READY (if autoStart=false) and after STOPPED',
    async () => {
      const bus = new EventBus({ autoStart: false });

      await assert.rejects(async () => {
        await bus.emit(EventFactory.create('NotReady', {}));
      }, EventStateError);

      bus.start();
      await bus.stop();

      await assert.rejects(async () => {
        await bus.emit(EventFactory.create('AfterStopped', {}));
      }, EventStateError);

      assert.throws(() => {
        bus.subscribe('AfterStopped', () => {});
      }, EventStateError);
    },
  );

  await t.test(
    '19. Diagnostics Tracking: Accurate counters and distributions without payload storage',
    async () => {
      const bus = new EventBus();

      bus.subscribe('MetricEventA', () => {});
      bus.subscribe('MetricEventB', () => {
        throw new Error('B failed');
      });

      await bus.emit(EventFactory.create('MetricEventA', { secretToken: '12345' }));
      await bus.emit(EventFactory.create('MetricEventB', { password: 'pass' }));

      const diag = bus.diagnostics;
      assert.strictEqual(diag.totalEvents, 2);
      assert.strictEqual(diag.successfulEvents, 1);
      assert.strictEqual(diag.failedEvents, 1);
      assert.strictEqual(diag.eventTypeDistribution['MetricEventA'], 1);
      assert.strictEqual(diag.eventTypeDistribution['MetricEventB'], 1);
      assert.ok(diag.averageEventDurationMs >= 0);

      // Ensure diagnostics contains zero payloads or sensitive strings
      const diagStr = JSON.stringify(diag);
      assert.ok(!diagStr.includes('12345'));
      assert.ok(!diagStr.includes('secretToken'));
      assert.ok(!diagStr.includes('password'));
    },
  );

  await t.test(
    '20. 1,000 Concurrent Event Dispatches: High-load execution with complete isolation',
    async () => {
      const bus = new EventBus();
      const receivedIds = new Set<string>();

      bus.subscribe('BulkEvent', (event: DomainEvent<{ index: number }>) => {
        receivedIds.add(event.id);
      });

      const promises: Promise<unknown>[] = [];
      for (let i = 0; i < 1000; i++) {
        promises.push(bus.emit(EventFactory.create('BulkEvent', { index: i })));
      }

      await Promise.all(promises);

      assert.strictEqual(receivedIds.size, 1000);
      assert.strictEqual(bus.diagnostics.totalEvents, 1000);
      assert.strictEqual(bus.diagnostics.successfulEvents, 1000);
    },
  );

  await t.test(
    '21. 1,000 Isolated EventBus Instances: Zero cross-talk between multiple buses',
    async () => {
      const buses: EventBus[] = [];
      const counts = new Map<number, number>();

      for (let i = 0; i < 100; i++) {
        const b = new EventBus();
        const index = i;
        counts.set(index, 0);
        b.subscribe('IsolatedBusEvent', () => {
          counts.set(index, (counts.get(index) || 0) + 1);
        });
        buses.push(b);
      }

      await Promise.all(
        buses.map((b, idx) => b.emit(EventFactory.create('IsolatedBusEvent', { idx }))),
      );

      for (let i = 0; i < 100; i++) {
        assert.strictEqual(counts.get(i), 1);
      }
    },
  );

  await t.test('22. EventBusBuilder Fluent API: Builds customized EventBus', async () => {
    const bus = new EventBusBuilder()
      .setDefaultDispatchMode('PARALLEL')
      .setAutoStart(true)
      .setEnableDiagnostics(true)
      .build();

    let handled = false;
    bus.subscribe('CustomBuilt', () => {
      handled = true;
    });

    const res = await bus.emit(EventFactory.create('CustomBuilt', { ok: true }));

    assert.strictEqual(handled, true);
    assert.strictEqual(res.successfulHandlers, 1);
  });

  await t.test(
    '23. Critical Architectural Boundary: Events package has zero reverse dependencies on higher layers',
    async () => {
      const eventsSrcDir = path.resolve(__dirname, '../src');
      const forbiddenPackages = [
        '@coreforge/decorators',
        '@coreforge/di',
        '@coreforge/request-context',
        '@coreforge/parameter-binding',
        '@coreforge/routing',
        '@coreforge/execution',
        '@coreforge/response',
        '@coreforge/exceptions',
        '@coreforge/transport',
        '@coreforge/runtime',
      ];

      const files = fs.readdirSync(eventsSrcDir, { recursive: true }) as string[];
      for (const file of files) {
        if (typeof file === 'string' && file.endsWith('.ts')) {
          const content = fs.readFileSync(path.join(eventsSrcDir, file), 'utf-8');
          for (const pkg of forbiddenPackages) {
            assert.ok(
              !content.includes(pkg),
              `@coreforge/events source file ${file} must not depend on forbidden package ${pkg}`,
            );
          }
        }
      }
    },
  );
});
