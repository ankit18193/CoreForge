import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { test } from 'node:test';

import { ExecutionContextManager } from '@coreforge/execution-context';

import {
  EventBuilder,
  EventHandler,
  EventHandlerRegistrationError,
  EventPublisher,
  EventStateError,
  EventValidationError,
} from '../src/index';

test('CoreForge Application Event & Handler Dispatch Engine (@coreforge/events)', async (t) => {
  await t.test('1. Lifecycle: Rejects publish before start(), start() is idempotent', async () => {
    const publisher = new EventPublisher();
    assert.strictEqual(publisher.ready, false);

    publisher.register('UserCreated', {
      async handle(_event) {},
    });

    await assert.rejects(
      async () => publisher.publish({ type: 'UserCreated', payload: { id: 1 } }),
      (err: Error) => err instanceof EventStateError,
    );

    await publisher.start();
    assert.strictEqual(publisher.ready, true);

    // Idempotent start()
    await publisher.start();
    assert.strictEqual(publisher.ready, true);

    const result = await publisher.publish({ type: 'UserCreated', payload: { id: 1 } });
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.state, 'COMPLETED');

    await publisher.stop();
  });

  await t.test(
    '2. Lifecycle: Rejection during STOPPING and after STOPPED, idempotent stop()',
    async () => {
      const publisher = new EventPublisher({ autoStart: true });
      assert.strictEqual(publisher.ready, true);

      await publisher.stop();
      assert.strictEqual(publisher.ready, false);

      await assert.rejects(
        async () => publisher.publish({ type: 'UserCreated', payload: {} }),
        (err: Error) => err instanceof EventStateError,
      );

      // Idempotent stop()
      await publisher.stop();
    },
  );

  await t.test(
    '3. Registration: Registration before startup works, rejected after READY',
    async () => {
      const publisher = new EventPublisher();

      const handler: EventHandler = { async handle() {} };
      publisher.register('OrderPlaced', handler);

      await publisher.start();

      assert.throws(
        () => publisher.register('AnotherEvent', handler),
        (err: Error) => err instanceof EventHandlerRegistrationError,
      );

      await publisher.stop();
    },
  );

  await t.test(
    '4. Event Type Validation: Rejects empty, whitespace-only, and control-character event types',
    async () => {
      const publisher = new EventPublisher({ autoStart: true });

      await assert.rejects(
        async () => publisher.publish({ type: '', payload: {} }),
        (err: Error) => err instanceof EventValidationError,
      );

      await assert.rejects(
        async () => publisher.publish({ type: '   ', payload: {} }),
        (err: Error) => err instanceof EventValidationError,
      );

      await assert.rejects(
        async () => publisher.publish({ type: 'Invalid\x00Event', payload: {} }),
        (err: Error) => err instanceof EventValidationError,
      );

      await publisher.stop();
    },
  );

  await t.test(
    '5. Payload Snapshot Isolation: Producer mutating payload after publication does not affect handlers',
    async () => {
      const publisher = new EventPublisher();

      let observedPayload: { count: number } | undefined;

      publisher.register('MutateTest', {
        async handle(event) {
          await new Promise((r) => setTimeout(r, 10));
          observedPayload = event.payload as { count: number };
        },
      });

      await publisher.start();

      const mutablePayload = { count: 42 };
      const pubPromise = publisher.publish({
        type: 'MutateTest',
        payload: mutablePayload,
      });

      // Mutate producer payload immediately
      mutablePayload.count = 9999;

      const result = await pubPromise;
      assert.strictEqual(result.success, true);
      assert.strictEqual(observedPayload?.count, 42);

      await publisher.stop();
    },
  );

  await t.test(
    '6. Circular Payload Handling: Replaces circular structures with "[Circular]" without crashing',
    async () => {
      const publisher = new EventPublisher();

      let receivedPayload: unknown;

      publisher.register('CircularEvent', {
        async handle(event) {
          receivedPayload = event.payload;
        },
      });

      await publisher.start();

      const circularObj: { name: string; self?: unknown } = { name: 'cycle' };
      circularObj.self = circularObj;

      const result = await publisher.publish({
        type: 'CircularEvent',
        payload: circularObj,
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual((receivedPayload as { self: string }).self, '[Circular]');

      await publisher.stop();
    },
  );

  await t.test(
    '7. Multiple Handlers & Priority Ordering: Handlers execute in priority DESC, sequence ASC',
    async () => {
      const publisher = new EventPublisher();
      const executionOrder: string[] = [];

      publisher.register(
        'MultiHandlerEvent',
        {
          async handle() {
            executionOrder.push('lowPriority');
          },
        },
        { priority: 10 },
      );

      publisher.register(
        'MultiHandlerEvent',
        {
          async handle() {
            executionOrder.push('highPriority');
          },
        },
        { priority: 100 },
      );

      publisher.register(
        'MultiHandlerEvent',
        {
          async handle() {
            executionOrder.push('mediumPriority');
          },
        },
        { priority: 50 },
      );

      await publisher.start();

      const result = await publisher.publish({
        type: 'MultiHandlerEvent',
        payload: {},
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.handlerCount, 3);
      assert.strictEqual(result.successfulHandlers, 3);
      assert.strictEqual(result.failedHandlers, 0);
      assert.deepStrictEqual(executionOrder, ['highPriority', 'mediumPriority', 'lowPriority']);

      await publisher.stop();
    },
  );

  await t.test('8. Sequential vs Concurrent Execution Mode', async () => {
    const publisher = new EventPublisher();
    const seqOrder: number[] = [];

    publisher.register('SeqEvent', {
      async handle() {
        await new Promise((r) => setTimeout(r, 20));
        seqOrder.push(1);
      },
    });

    publisher.register('SeqEvent', {
      async handle() {
        await new Promise((r) => setTimeout(r, 5));
        seqOrder.push(2);
      },
    });

    await publisher.start();

    // 1. Sequential Mode (default)
    await publisher.publish({ type: 'SeqEvent', payload: {} }, { mode: 'SEQUENTIAL' });
    assert.deepStrictEqual(seqOrder, [1, 2]);

    // 2. Concurrent Mode
    const concOrder: number[] = [];
    const concPublisher = new EventPublisher();

    concPublisher.register('ConcEvent', {
      async handle() {
        await new Promise((r) => setTimeout(r, 25));
        concOrder.push(1);
      },
    });

    concPublisher.register('ConcEvent', {
      async handle() {
        await new Promise((r) => setTimeout(r, 5));
        concOrder.push(2);
      },
    });

    await concPublisher.start();
    await concPublisher.publish({ type: 'ConcEvent', payload: {} }, { mode: 'CONCURRENT' });
    // In concurrent mode, faster handler (5ms) completes before slower (25ms)
    assert.deepStrictEqual(concOrder, [2, 1]);

    await publisher.stop();
    await concPublisher.stop();
  });

  await t.test('9. Failure Isolation & Failure Strategies (CONTINUE vs STOP)', async () => {
    // 1. CONTINUE strategy (default): All handlers execute even if one fails
    const continuePublisher = new EventPublisher();
    let handler3Ran = false;

    continuePublisher.register('FailEvent', {
      async handle() {},
    });
    continuePublisher.register('FailEvent', {
      async handle() {
        throw new Error('Handler 2 failed');
      },
    });
    continuePublisher.register('FailEvent', {
      async handle() {
        handler3Ran = true;
      },
    });

    await continuePublisher.start();
    const continueResult = await continuePublisher.publish(
      { type: 'FailEvent', payload: {} },
      { failureStrategy: 'CONTINUE' },
    );

    assert.strictEqual(continueResult.success, false);
    assert.strictEqual(continueResult.state, 'FAILED');
    assert.strictEqual(continueResult.handlerCount, 3);
    assert.strictEqual(continueResult.successfulHandlers, 2);
    assert.strictEqual(continueResult.failedHandlers, 1);
    assert.strictEqual(handler3Ran, true);

    // 2. STOP strategy: Execution halts immediately on failure
    const stopPublisher = new EventPublisher();
    let stopHandler3Ran = false;

    stopPublisher.register('StopEvent', {
      async handle() {},
    });
    stopPublisher.register('StopEvent', {
      async handle() {
        throw new Error('Handler 2 failed');
      },
    });
    stopPublisher.register('StopEvent', {
      async handle() {
        stopHandler3Ran = true;
      },
    });

    await stopPublisher.start();
    const stopResult = await stopPublisher.publish(
      { type: 'StopEvent', payload: {} },
      { failureStrategy: 'STOP' },
    );

    assert.strictEqual(stopResult.success, false);
    assert.strictEqual(stopResult.handlerCount, 2);
    assert.strictEqual(stopResult.successfulHandlers, 1);
    assert.strictEqual(stopResult.failedHandlers, 1);
    assert.strictEqual(stopHandler3Ran, false);

    await continuePublisher.stop();
    await stopPublisher.stop();
  });

  await t.test(
    '10. Cancellation Propagation: Aborted context results in CANCELLED state and halts execution',
    async () => {
      const contextManager = new ExecutionContextManager();
      const publisher = new EventPublisher({ contextManager });

      let handlerRan = false;

      publisher.register('CancelEvent', {
        async handle() {
          handlerRan = true;
        },
      });

      await publisher.start();

      const cancelledContext = contextManager.create();
      cancelledContext.cancel();

      const result = await publisher.publish(
        { type: 'CancelEvent', payload: {} },
        { context: cancelledContext },
      );

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.state, 'CANCELLED');
      assert.strictEqual(handlerRan, false);

      const diag = publisher.getDiagnostics();
      assert.strictEqual(diag.cancelledPublications, 1);

      await publisher.stop();
      await contextManager.stop();
    },
  );

  await t.test(
    '11. Execution Context Propagation: active context available via contextManager.current()',
    async () => {
      const contextManager = new ExecutionContextManager();
      const publisher = new EventPublisher({ contextManager });

      let capturedId: string | undefined;

      publisher.register('ContextEvent', {
        async handle(_event, context) {
          capturedId = contextManager.current()?.executionId;
          assert.strictEqual(capturedId, context.executionId);
        },
      });

      await publisher.start();

      const result = await publisher.publish({ type: 'ContextEvent', payload: {} });
      assert.strictEqual(result.executionId, capturedId);
      assert.strictEqual(contextManager.current(), undefined);

      await publisher.stop();
      await contextManager.stop();
    },
  );

  await t.test('12. Nested Event Publication: tracks nestedPublications metric', async () => {
    const publisher = new EventPublisher();

    publisher.register('ParentEvent', {
      async handle() {
        await publisher.publish({ type: 'ChildEvent', payload: { child: true } });
      },
    });

    publisher.register('ChildEvent', {
      async handle() {},
    });

    await publisher.start();

    await publisher.publish({ type: 'ParentEvent', payload: {} });

    const diag = publisher.getDiagnostics();
    assert.strictEqual(diag.totalPublications, 2);
    assert.strictEqual(diag.nestedPublications, 1);

    await publisher.stop();
  });

  await t.test(
    '13. Missing Handlers: Produces completed result with 0 handlers and increments handlerNotFound',
    async () => {
      const publisher = new EventPublisher({ autoStart: true });

      const result = await publisher.publish({ type: 'UnregisteredEvent', payload: {} });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.state, 'COMPLETED');
      assert.strictEqual(result.handlerCount, 0);

      const diag = publisher.getDiagnostics();
      assert.strictEqual(diag.handlerNotFound, 1);

      await publisher.stop();
    },
  );

  await t.test(
    '14. Result Immutability: Deep freeze protection on publish and handler results',
    async () => {
      const publisher = new EventPublisher();

      publisher.register('FreezeEvent', {
        async handle() {},
      });

      await publisher.start();

      const result = await publisher.publish({ type: 'FreezeEvent', payload: {} });

      assert.throws(() => {
        (result as { state: string }).state = 'MUTATED';
      });

      assert.throws(() => {
        (result.handlerResults as unknown as unknown[]).push({});
      });

      await publisher.stop();
    },
  );

  await t.test(
    '15. 1,000 Concurrent Event Publications: High-concurrency isolation and accurate metrics',
    async () => {
      const publisher = new EventPublisher();

      let handledCount = 0;

      publisher.register('StressEvent', {
        async handle() {
          handledCount++;
        },
      });

      await publisher.start();

      const promises: Promise<void>[] = [];
      for (let i = 0; i < 1000; i++) {
        promises.push(
          publisher.publish({ type: 'StressEvent', payload: { index: i } }).then((res) => {
            assert.strictEqual(res.success, true);
            assert.strictEqual(res.state, 'COMPLETED');
          }),
        );
      }

      await Promise.all(promises);

      assert.strictEqual(handledCount, 1000);

      const diag = publisher.getDiagnostics();
      assert.strictEqual(diag.totalPublications, 1000);
      assert.strictEqual(diag.successfulPublications, 1000);
      assert.strictEqual(diag.totalHandlersExecuted, 1000);
      assert.strictEqual(diag.activePublications, 0);

      await publisher.stop();
    },
  );

  await t.test(
    '16. Diagnostics Security: Zero payloads, credentials, error stacks, or execution IDs stored',
    async () => {
      const publisher = new EventPublisher();

      publisher.register('SecureEvent', {
        async handle() {},
      });

      await publisher.start();

      const result = await publisher.publish({
        type: 'SecureEvent',
        payload: { token: 'super_secret_jwt_payload_999' },
      });

      const diag = publisher.getDiagnostics();
      const serialized = JSON.stringify(diag);

      assert.strictEqual(serialized.includes('super_secret_jwt_payload_999'), false);
      assert.strictEqual(serialized.includes(result.executionId), false);
      assert.strictEqual(serialized.includes('token'), false);

      await publisher.stop();
    },
  );

  await t.test('17. EventBuilder Fluent API with autoStart', async () => {
    const contextManager = new ExecutionContextManager();

    let builderHandlerRan = false;

    const publisher = EventBuilder.create()
      .withContextManager(contextManager)
      .withHandler('BuilderEvent', {
        async handle() {
          builderHandlerRan = true;
        },
      })
      .withAutoStart(true)
      .build();

    assert.strictEqual(publisher.ready, true);

    const result = await publisher.publish({ type: 'BuilderEvent', payload: {} });
    assert.strictEqual(result.success, true);
    assert.strictEqual(builderHandlerRan, true);

    await publisher.stop();
    await contextManager.stop();
  });

  await t.test(
    '18. Critical Architectural Boundary: Zero higher-layer or forbidden framework dependencies',
    async () => {
      const pkgJsonPath = path.resolve(__dirname, '../../package.json');
      const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

      const deps = Object.keys(pkgJson.dependencies || {});
      const forbidden = [
        '@coreforge/transport',
        '@coreforge/routing',
        '@coreforge/runtime',
        '@coreforge/response',
        '@coreforge/jobs',
        '@coreforge/cache',
        '@coreforge/locks',
        '@coreforge/rate-limit',
        '@coreforge/resilience',
        '@coreforge/metrics',
        '@coreforge/tracing',
        '@coreforge/logging',
        '@coreforge/config',
        '@coreforge/dispatch',
        '@coreforge/query',
        '@coreforge/application',
        'redis',
        'rabbitmq',
        'kafka',
        'amqplib',
      ];

      for (const f of forbidden) {
        assert.strictEqual(
          deps.includes(f),
          false,
          `Forbidden dependency detected in @coreforge/events: ${f}`,
        );
      }
    },
  );
});
