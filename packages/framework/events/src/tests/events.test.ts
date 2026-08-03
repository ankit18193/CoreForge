import * as assert from 'node:assert';
import { test } from 'node:test';

import { EventBus } from '../bus/EventBus';
import {
  EventHandlerError,
  EventRegistrationError,
  UnknownEventError,
} from '../errors/EventErrors';
import { BaseEvent } from '../events/BaseEvent';

test('Event Bus', async (t) => {
  class TestEvent extends BaseEvent<{ value: string }> {
    constructor(value: string) {
      super('TestEvent', { value });
    }
  }

  class AnotherEvent extends BaseEvent<{ number: number }> {
    constructor(number: number) {
      super('AnotherEvent', { number });
    }
  }

  await t.test('should publish event to a single handler', async () => {
    const eventBus = new EventBus();
    let received: string | null = null;

    eventBus.subscribe(TestEvent, (event) => {
      received = event.payload.value;
    });

    const context = await eventBus.publish(new TestEvent('hello'));
    assert.strictEqual(received, 'hello');
    assert.strictEqual(context.handlerCount, 1);
    assert.ok(context.duration >= 0);
  });

  await t.test('should publish event to multiple handlers in registration order', async () => {
    const eventBus = new EventBus();
    const order: string[] = [];

    eventBus.subscribe(TestEvent, () => {
      order.push('first');
    });

    eventBus.subscribe(TestEvent, () => {
      order.push('second');
    });

    await eventBus.publish(new TestEvent('test'));
    assert.deepStrictEqual(order, ['first', 'second']);
  });

  await t.test('should support mixing sync and async handlers and await completion', async () => {
    const eventBus = new EventBus();
    const timeline: string[] = [];

    eventBus.subscribe(TestEvent, async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      timeline.push('async-completed');
    });

    eventBus.subscribe(TestEvent, () => {
      timeline.push('sync-completed');
    });

    await eventBus.publish(new TestEvent('run'));
    assert.deepStrictEqual(timeline, ['async-completed', 'sync-completed']);
  });

  await t.test('should support unsubscribe and remove subscriptions', async () => {
    const eventBus = new EventBus();
    let count = 0;

    const sub = eventBus.subscribe(TestEvent, () => {
      count++;
    });

    await eventBus.publish(new TestEvent('first'));
    assert.strictEqual(count, 1);

    eventBus.unsubscribe(sub);

    await eventBus.publish(new TestEvent('second'));
    assert.strictEqual(count, 1);
  });

  await t.test(
    'should fail fast on invalid subscriptions or unknown events during unsubscribe',
    async () => {
      const eventBus = new EventBus();

      assert.throws(
        () => {
          eventBus.unsubscribe({ id: 'non-existent', eventType: TestEvent });
        },
        (err: unknown) => {
          return err instanceof UnknownEventError;
        },
      );
    },
  );

  await t.test('should reject invalid subscriptions registration', async () => {
    const eventBus = new EventBus();

    assert.throws(
      () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        eventBus.subscribe(null as any, () => {});
      },
      (err: unknown) => {
        return err instanceof EventRegistrationError;
      },
    );
  });

  await t.test(
    'should wrap handler exceptions inside EventHandlerError and preserve the cause',
    async () => {
      const eventBus = new EventBus();
      const originalError = new Error('Database failure');

      eventBus.subscribe(TestEvent, () => {
        throw originalError;
      });

      await assert.rejects(
        async () => {
          await eventBus.publish(new TestEvent('error'));
        },
        (err: unknown) => {
          return (
            err instanceof EventHandlerError &&
            err.cause === originalError &&
            err.message.includes('Database failure')
          );
        },
      );
    },
  );

  await t.test('should enforce deep immutability on payload and headers', async () => {
    const event = new TestEvent('immutable');

    assert.throws(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (event as any).id = 'changed';
    }, TypeError);

    assert.throws(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (event.payload as any).value = 'mutated';
    }, TypeError);
  });

  await t.test('should support nested event publishing safely', async () => {
    const eventBus = new EventBus();
    let nestedReceived = 0;

    eventBus.subscribe(TestEvent, async () => {
      await eventBus.publish(new AnotherEvent(100));
    });

    eventBus.subscribe(AnotherEvent, (event) => {
      nestedReceived = event.payload.number;
    });

    await eventBus.publish(new TestEvent('start'));
    assert.strictEqual(nestedReceived, 100);
  });
});
