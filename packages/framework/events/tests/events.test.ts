import * as assert from 'node:assert';
import { test } from 'node:test';

import {
  EventHandler,
  EventHandlerRegistry,
  EventHandlerResolver,
  EventResultFactory,
  EventSnapshot,
  EventValidationError,
  EventValidator,
} from '../src/index';

test('CoreForge Application Event & Handler Dispatch Engine (@coreforge/events) - Stage 1', async (t) => {
  await t.test('1. Event Validator: validates non-null event and string type', () => {
    assert.throws(
      () => EventValidator.validate(null),
      (err: Error) => err instanceof EventValidationError,
    );

    assert.throws(
      () => EventValidator.validate({ type: '', payload: {} }),
      (err: Error) => err instanceof EventValidationError,
    );

    assert.throws(
      () => EventValidator.validate({ type: '   ', payload: {} }),
      (err: Error) => err instanceof EventValidationError,
    );

    assert.throws(
      () => EventValidator.validate({ type: 'Invalid\x00Type', payload: {} }),
      (err: Error) => err instanceof EventValidationError,
    );

    assert.doesNotThrow(() => EventValidator.validate({ type: 'UserCreated', payload: { id: 1 } }));
  });

  await t.test('2. Event Snapshot: Deep freeze and circular references', () => {
    const obj: { name: string; self?: unknown } = { name: 'event-data' };
    obj.self = obj;

    const snapshot = EventSnapshot.create({
      type: 'OrderPlaced',
      payload: obj,
    });

    assert.strictEqual(snapshot.type, 'OrderPlaced');
    assert.strictEqual((snapshot.payload as { self: unknown }).self, '[Circular]');
    assert.throws(() => {
      (snapshot as { type: string }).type = 'Mutated';
    });
  });

  await t.test('3. Event Handler Registry: Multiple handlers and priority ordering', () => {
    const registry = new EventHandlerRegistry();

    const handlerA: EventHandler = { handle() {} };
    const handlerB: EventHandler = { handle() {} };
    const handlerC: EventHandler = { handle() {} };

    registry.register('UserRegistered', handlerA, { priority: 10 });
    registry.register('UserRegistered', handlerB, { priority: 100 });
    registry.register('UserRegistered', handlerC, { priority: 10 });

    const handlers = EventHandlerResolver.resolve(registry, 'UserRegistered');
    assert.strictEqual(handlers.length, 3);
    assert.strictEqual(handlers[0].handler, handlerB); // priority 100
    assert.strictEqual(handlers[1].handler, handlerA); // priority 10, seq 1
    assert.strictEqual(handlers[2].handler, handlerC); // priority 10, seq 2
  });

  await t.test('4. Result Factory: creates deeply frozen results', () => {
    const handlerRes = EventResultFactory.createHandlerCompleted('AuditHandler', 12.5);
    assert.strictEqual(handlerRes.success, true);
    assert.strictEqual(handlerRes.durationMs, 12.5);

    const pubRes = EventResultFactory.createPublishCompleted('UserRegistered', 'exec-123', 45.6, [
      handlerRes,
    ]);

    assert.strictEqual(pubRes.success, true);
    assert.strictEqual(pubRes.state, 'COMPLETED');
    assert.strictEqual(pubRes.handlerCount, 1);
    assert.strictEqual(pubRes.successfulHandlers, 1);
    assert.strictEqual(pubRes.failedHandlers, 0);
  });
});
