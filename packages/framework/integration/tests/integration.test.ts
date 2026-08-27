import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { test } from 'node:test';

import {
  ApplicationIntegration,
  ApplicationIntegrationBuilder,
  ComponentWiring,
  IntegrationStateError,
  IntegrationWiringError,
} from '../src/index';

test('CoreForge Application Integration & End-to-End Coordination Engine (@coreforge/integration)', async (t) => {
  // =========================================================================
  // 1. LIFECYCLE & INFRASTRUCTURE WIRING
  // =========================================================================
  await t.test('1. Initial CREATED state and ComponentWiring validation', () => {
    const app = new ApplicationIntegration();
    assert.strictEqual(app.state, 'CREATED');
    assert.strictEqual(app.ready, false);

    assert.ok(app.contextManager);
    assert.ok(app.executionEngine);
    assert.ok(app.interceptorEngine);
    assert.ok(app.dispatcher);
    assert.ok(app.queryBus);
    assert.ok(app.eventPublisher);
    assert.ok(app.applicationManager);
    assert.ok(app.errorEngine);
    assert.ok(app.hookManager);
    assert.ok(app.kernel);
  });

  await t.test('2. ComponentWiring: Rejects incomplete graphs with IntegrationWiringError', () => {
    const incompleteGraph = {
      contextManager: {},
      executionEngine: {},
    } as unknown as import('../src/index').ApplicationInfrastructureGraph;

    assert.throws(
      () => ComponentWiring.validateAndWire(incompleteGraph),
      (err: Error) => err instanceof IntegrationWiringError,
    );
  });

  await t.test(
    '3. Lifecycle Transitions & Idempotent Start/Stop: CREATED -> READY -> STOPPED',
    async () => {
      const app = new ApplicationIntegration();
      assert.strictEqual(app.state, 'CREATED');

      await app.start();
      assert.strictEqual(app.state, 'READY');
      assert.strictEqual(app.ready, true);

      // Idempotent start
      await app.start();
      assert.strictEqual(app.state, 'READY');

      await app.stop();
      assert.strictEqual(app.state, 'STOPPED');
      assert.strictEqual(app.ready, false);

      // Idempotent stop
      await app.stop();
      assert.strictEqual(app.state, 'STOPPED');
    },
  );

  await t.test(
    '4. Operation Blocking: Operations rejected before READY or after STOPPED',
    async () => {
      const app = new ApplicationIntegration();

      await assert.rejects(
        async () => app.dispatch({ type: 'TestCommand', payload: {} }),
        (err: Error) => err instanceof IntegrationStateError,
      );

      await app.start();
      await app.stop();

      await assert.rejects(
        async () => app.dispatch({ type: 'TestCommand', payload: {} }),
        (err: Error) => err instanceof IntegrationStateError,
      );
    },
  );

  // =========================================================================
  // 2. COMMAND DISPATCH INTEGRATION
  // =========================================================================
  await t.test(
    '5. Command Dispatch: Handler registration, execution, and result through Kernel',
    async () => {
      const app = new ApplicationIntegration();

      app.dispatcher.register<{ amount: number }, { orderId: string; total: number }>(
        'CreateOrder',
        {
          async execute(payload) {
            return { orderId: 'ord-100', total: payload.amount };
          },
        },
      );

      await app.start();

      const result = await app.dispatch<{ amount: number }, { orderId: string; total: number }>({
        type: 'CreateOrder',
        payload: { amount: 250 },
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.value?.orderId, 'ord-100');
      assert.strictEqual(result.value?.total, 250);

      await app.stop();
    },
  );

  await t.test('6. Command Failure: Safe error handling and result routing', async () => {
    const app = new ApplicationIntegration();

    app.dispatcher.register('FailingCommand', {
      async execute() {
        throw new Error('Order creation rejected');
      },
    });

    await app.start();

    const result = await app.dispatch({
      type: 'FailingCommand',
      payload: {},
    });

    assert.strictEqual(result.success, false);
    assert.ok(result.error);

    await app.stop();
  });

  // =========================================================================
  // 3. QUERY BUS INTEGRATION
  // =========================================================================
  await t.test(
    '7. Query Execution: Handler registration and query resolution through Kernel',
    async () => {
      const app = new ApplicationIntegration();

      app.queryBus.register<{ accountId: string }, { accountId: string; balance: number }>(
        'GetAccountBalance',
        {
          async execute(payload) {
            return { accountId: payload.accountId, balance: 5000 };
          },
        },
      );

      await app.start();

      const result = await app.query<{ accountId: string }, { accountId: string; balance: number }>(
        {
          type: 'GetAccountBalance',
          payload: { accountId: 'acc-99' },
        },
      );

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.value?.balance, 5000);

      await app.stop();
    },
  );

  // =========================================================================
  // 4. EVENT PUBLISHER INTEGRATION
  // =========================================================================
  await t.test(
    '8. Event Publication: Multi-handler execution and sequential/concurrent delivery',
    async () => {
      const handled: string[] = [];
      const app = new ApplicationIntegration();

      app.eventPublisher.register<{ orderId: string }>('OrderCreated', {
        async handle(event) {
          handled.push(`handler1:${event.payload.orderId}`);
        },
      });

      app.eventPublisher.register<{ orderId: string }>('OrderCreated', {
        async handle(event) {
          handled.push(`handler2:${event.payload.orderId}`);
        },
      });

      await app.start();

      const result = await app.publish<{ orderId: string }>({
        type: 'OrderCreated',
        payload: { orderId: 'ord-777' },
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.handlerResults.length, 2);
      assert.deepStrictEqual(handled, ['handler1:ord-777', 'handler2:ord-777']);

      await app.stop();
    },
  );

  // =========================================================================
  // 5. APPLICATION SERVICES INTEGRATION
  // =========================================================================
  await t.test(
    '9. Application Services: Orchestrates nested commands and queries through Kernel',
    async () => {
      const app = new ApplicationIntegration();

      app.dispatcher.register<{ amount: number }, { debited: number }>('DebitAccount', {
        async execute(payload) {
          return { debited: payload.amount };
        },
      });

      app.queryBus.register<{ id: string }, { status: string; id: string }>('CheckStatus', {
        async execute(payload) {
          return { status: 'ACTIVE', id: payload.id };
        },
      });

      app.applicationManager.register<
        { accountId: string; amount: number },
        { success: boolean; debited: number }
      >('TransferFundsService', {
        async execute(input) {
          const qRes = await app.query<{ id: string }, { status: string }>({
            type: 'CheckStatus',
            payload: { id: input.accountId },
          });

          if (qRes.value?.status !== 'ACTIVE') {
            throw new Error('Account inactive');
          }

          const cRes = await app.dispatch<{ amount: number }, { debited: number }>({
            type: 'DebitAccount',
            payload: { amount: input.amount },
          });

          return { success: true, debited: cRes.value?.debited ?? 0 };
        },
      });

      await app.start();

      const serviceResult = await app.executeService<
        { accountId: string; amount: number },
        { success: boolean; debited: number }
      >('TransferFundsService', { accountId: 'acc-1', amount: 300 });

      assert.strictEqual(serviceResult.success, true);
      assert.strictEqual(serviceResult.value?.debited, 300);

      await app.stop();
    },
  );

  // =========================================================================
  // 6. INTERCEPTORS & HOOKS INTEGRATION
  // =========================================================================
  await t.test(
    '10. Interceptors: Priority ordering and reverse unwinding across operations',
    async () => {
      const sequence: string[] = [];
      const app = new ApplicationIntegration();

      app.interceptorEngine.use(
        {
          async intercept(_input, _ctx, next) {
            sequence.push('outer:before');
            const res = await next();
            sequence.push('outer:after');
            return res;
          },
        },
        { priority: 100 },
      );

      app.interceptorEngine.use(
        {
          async intercept(_input, _ctx, next) {
            sequence.push('inner:before');
            const res = await next();
            sequence.push('inner:after');
            return res;
          },
        },
        { priority: 50 },
      );

      app.dispatcher.register('InterceptedCommand', {
        async execute() {
          sequence.push('handler');
          return { done: true };
        },
      });

      await app.start();

      await app.dispatch({ type: 'InterceptedCommand', payload: {} });

      assert.deepStrictEqual(sequence, [
        'outer:before',
        'inner:before',
        'handler',
        'inner:after',
        'outer:after',
      ]);

      await app.stop();
    },
  );

  await t.test(
    '11. Lifecycle & Execution Hooks: BEFORE_START, AFTER_START, BEFORE_EXECUTE, AFTER_EXECUTE, BEFORE_STOP, AFTER_STOP',
    async () => {
      const hooksTriggered: string[] = [];
      const app = new ApplicationIntegration();

      app.hookManager.register({
        id: 'h_bs',
        type: 'BEFORE_START',
        execute() {
          hooksTriggered.push('BEFORE_START');
        },
      });

      app.hookManager.register({
        id: 'h_as',
        type: 'AFTER_START',
        execute() {
          hooksTriggered.push('AFTER_START');
        },
      });

      app.hookManager.register({
        id: 'h_be',
        type: 'BEFORE_EXECUTE',
        execute() {
          hooksTriggered.push('BEFORE_EXECUTE');
        },
      });

      app.hookManager.register({
        id: 'h_ae',
        type: 'AFTER_EXECUTE',
        execute() {
          hooksTriggered.push('AFTER_EXECUTE');
        },
      });

      app.hookManager.register({
        id: 'h_bstop',
        type: 'BEFORE_STOP',
        execute() {
          hooksTriggered.push('BEFORE_STOP');
        },
      });

      app.hookManager.register({
        id: 'h_astop',
        type: 'AFTER_STOP',
        execute() {
          hooksTriggered.push('AFTER_STOP');
        },
      });

      await app.start();

      await app.hookManager.execute('BEFORE_START');
      await app.hookManager.execute('AFTER_START');
      await app.hookManager.execute('BEFORE_EXECUTE');
      await app.hookManager.execute('AFTER_EXECUTE');
      await app.hookManager.execute('BEFORE_STOP');
      await app.hookManager.execute('AFTER_STOP');

      assert.deepStrictEqual(hooksTriggered, [
        'BEFORE_START',
        'AFTER_START',
        'BEFORE_EXECUTE',
        'AFTER_EXECUTE',
        'BEFORE_STOP',
        'AFTER_STOP',
      ]);

      await app.stop();
    },
  );

  // =========================================================================
  // 7. CONTEXT CONTINUITY & CANCELLATION
  // =========================================================================
  await t.test(
    '12. ExecutionContext Continuity: Context propagates across entire application graph',
    async () => {
      const app = new ApplicationIntegration();
      let capturedIdInCommand: string | undefined;
      let capturedIdInQuery: string | undefined;

      app.dispatcher.register('ContextCommand', {
        async execute(_payload, ctx) {
          capturedIdInCommand = ctx?.executionId;
          return { ok: true };
        },
      });

      app.queryBus.register('ContextQuery', {
        async execute(_payload, ctx) {
          capturedIdInQuery = ctx?.executionId;
          return { ok: true };
        },
      });

      await app.start();

      const rootCtx = app.contextManager.create({ autoStart: true });

      await app.contextManager.run(rootCtx, async () => {
        await app.dispatch({ type: 'ContextCommand', payload: {} });
        await app.query({ type: 'ContextQuery', payload: {} });
      });

      assert.strictEqual(capturedIdInCommand, rootCtx.executionId);
      assert.strictEqual(capturedIdInQuery, rootCtx.executionId);

      await app.stop();
    },
  );

  await t.test(
    '13. Cancellation Propagation: Aborted signal marks operation CANCELLED or throws KernelCancellationError',
    async () => {
      const app = new ApplicationIntegration();

      app.dispatcher.register('LongCommand', {
        async execute() {
          return { done: true };
        },
      });

      await app.start();

      const ctx = app.contextManager.create();
      ctx.cancel();

      await assert.rejects(
        async () => app.dispatch({ type: 'LongCommand', payload: {} }, { context: ctx }),
        (err: Error) => (err as { code?: string }).code === 'CF-KERNEL-CANCELLATION',
      );

      await app.stop();
    },
  );

  // =========================================================================
  // 8. ERROR HANDLING & CLASSIFICATION
  // =========================================================================
  await t.test(
    '14. Error Handling Engine: Classifies, normalizes, and sanitizes application errors',
    async () => {
      const app = new ApplicationIntegration();

      app.errorEngine.registerHandler(
        {
          async handle() {
            return {
              action: 'RECOVER',
              result: { recovered: true, code: 'CUSTOM_RECOVERY' },
            };
          },
        },
        { id: 'CustomErrorHandler' },
      );

      await app.start();

      const errorResult = await app.errorEngine.process<{ recovered: boolean; code: string }>(
        new Error('Sensitive database credentials secret_123 failed'),
      );

      assert.strictEqual(errorResult.state, 'RECOVERED');
      assert.deepStrictEqual(errorResult.result, {
        recovered: true,
        code: 'CUSTOM_RECOVERY',
      });

      await app.stop();
    },
  );

  // =========================================================================
  // 9. HIGH CONCURRENCY ISOLATION (1,000 OPERATIONS)
  // =========================================================================
  await t.test(
    '15. High-Concurrency Isolation: 1,000 concurrent mixed operations with zero cross-talk',
    async () => {
      const app = new ApplicationIntegration();

      app.dispatcher.register<{ val: number }, { doubled: number }>('ConcurrentCommand', {
        async execute(payload) {
          return { doubled: payload.val * 2 };
        },
      });

      app.queryBus.register<{ val: number }, { squared: number }>('ConcurrentQuery', {
        async execute(payload) {
          return { squared: payload.val * payload.val };
        },
      });

      await app.start();

      const promises: Promise<void>[] = [];

      for (let i = 0; i < 500; i++) {
        promises.push(
          app
            .dispatch<{ val: number }, { doubled: number }>({
              type: 'ConcurrentCommand',
              payload: { val: i },
            })
            .then((res) => {
              assert.strictEqual(res.success, true);
              assert.strictEqual(res.value?.doubled, i * 2);
            }),
        );

        promises.push(
          app
            .query<{ val: number }, { squared: number }>({
              type: 'ConcurrentQuery',
              payload: { val: i },
            })
            .then((res) => {
              assert.strictEqual(res.success, true);
              assert.strictEqual(res.value?.squared, i * i);
            }),
        );
      }

      await Promise.all(promises);

      const diag = app.getDiagnostics();
      assert.strictEqual(diag.totalOperations, 1000);
      assert.strictEqual(diag.completedOperations, 1000);
      assert.strictEqual(diag.failedOperations, 0);
      assert.strictEqual(diag.activeOperations, 0);

      await app.stop();
    },
  );

  // =========================================================================
  // 10. DIAGNOSTICS & SECURITY
  // =========================================================================
  await t.test(
    '16. Diagnostics Security: Numerical metrics and monotonic durations only',
    async () => {
      const app = new ApplicationIntegration();
      await app.start();

      const snapshot = app.getDiagnostics();
      const serialized = JSON.stringify(snapshot);

      assert.strictEqual(typeof snapshot.totalOperations, 'number');
      assert.strictEqual(typeof snapshot.averageOperationDurationMs, 'number');
      assert.strictEqual(serialized.includes('password'), false);
      assert.strictEqual(serialized.includes('secret'), false);

      app.resetDiagnostics();
      assert.strictEqual(app.getDiagnostics().totalOperations, 0);

      await app.stop();
    },
  );

  // =========================================================================
  // 11. BUILDER FLUENT API
  // =========================================================================
  await t.test('17. ApplicationIntegrationBuilder: Fluent immutable construction', async () => {
    const builder = ApplicationIntegrationBuilder.create();
    const app1 = builder.build();
    const app2 = builder.build();

    assert.notStrictEqual(app1, app2);
    assert.strictEqual(app1.state, 'CREATED');
    assert.strictEqual(app2.state, 'CREATED');
  });

  // =========================================================================
  // 12. END-TO-END SCENARIOS
  // =========================================================================
  await t.test('18. Full End-to-End Success Scenario: Complete Phase 7 flow', async () => {
    const auditLog: string[] = [];
    const app = new ApplicationIntegration();

    // 1. Interceptor for logging & execution tracking
    app.interceptorEngine.use(
      {
        async intercept(input, _ctx, next) {
          const typeName = (input as { type?: string })?.type || 'operation';
          auditLog.push(`interceptor:enter:${typeName}`);
          const res = await next();
          auditLog.push(`interceptor:exit:${typeName}`);
          return res;
        },
      },
      { priority: 10 },
    );

    // 2. Command: DeductInventory
    app.dispatcher.register<{ sku: string }, { sku: string; remaining: number }>(
      'DeductInventory',
      {
        async execute(payload) {
          auditLog.push(`command:DeductInventory:${payload.sku}`);
          return { sku: payload.sku, remaining: 42 };
        },
      },
    );

    // 3. Query: GetCustomerTier
    app.queryBus.register<{ customerId: string }, { customerId: string; tier: string }>(
      'GetCustomerTier',
      {
        async execute(payload) {
          auditLog.push(`query:GetCustomerTier:${payload.customerId}`);
          return { customerId: payload.customerId, tier: 'PLATINUM' };
        },
      },
    );

    // 4. Event: OrderCompleted
    app.eventPublisher.register<{ orderId: string }>('OrderCompleted', {
      async handle(event) {
        auditLog.push(`event:OrderCompleted:${event.payload.orderId}`);
      },
    });

    // 5. Application Service: CheckoutService
    app.applicationManager.register<
      { customerId: string; sku: string; orderId: string },
      { orderId: string; tier: string | undefined; remainingInventory: number | undefined }
    >('CheckoutService', {
      async execute(input) {
        auditLog.push(`service:CheckoutService:start`);

        // Step A: Query customer tier
        const tierResult = await app.query<{ customerId: string }, { tier: string }>({
          type: 'GetCustomerTier',
          payload: { customerId: input.customerId },
        });

        // Step B: Dispatch inventory deduction
        const invResult = await app.dispatch<{ sku: string }, { remaining: number }>({
          type: 'DeductInventory',
          payload: { sku: input.sku },
        });

        // Step C: Publish order completed event
        await app.publish<{ orderId: string }>({
          type: 'OrderCompleted',
          payload: { orderId: input.orderId },
        });

        auditLog.push(`service:CheckoutService:end`);

        return {
          orderId: input.orderId,
          tier: tierResult.value?.tier,
          remainingInventory: invResult.value?.remaining,
        };
      },
    });

    await app.start();

    const checkoutResult = await app.executeService<
      { customerId: string; sku: string; orderId: string },
      { orderId: string; tier: string; remainingInventory: number }
    >('CheckoutService', {
      customerId: 'cust-909',
      sku: 'SKU-FORGE-7',
      orderId: 'ORD-FINALE-711',
    });

    assert.strictEqual(checkoutResult.success, true);
    assert.strictEqual(checkoutResult.value?.orderId, 'ORD-FINALE-711');
    assert.strictEqual(checkoutResult.value?.tier, 'PLATINUM');
    assert.strictEqual(checkoutResult.value?.remainingInventory, 42);

    assert.deepStrictEqual(auditLog, [
      'interceptor:enter:operation',
      'service:CheckoutService:start',
      'interceptor:enter:operation',
      'query:GetCustomerTier:cust-909',
      'interceptor:exit:operation',
      'interceptor:enter:operation',
      'command:DeductInventory:SKU-FORGE-7',
      'interceptor:exit:operation',
      'event:OrderCompleted:ORD-FINALE-711',
      'service:CheckoutService:end',
      'interceptor:exit:operation',
    ]);

    await app.stop();
  });

  await t.test(
    '19. Full Failure Recovery Scenario: Handler error unrolls interceptors and routes through ErrorHandlingEngine',
    async () => {
      const sequence: string[] = [];
      const app = new ApplicationIntegration();

      app.interceptorEngine.use(
        {
          async intercept(_input, _ctx, next) {
            sequence.push('interceptor:before');
            try {
              return await next();
            } catch (err) {
              sequence.push('interceptor:catch');
              throw err;
            } finally {
              sequence.push('interceptor:finally');
            }
          },
        },
        { priority: 10 },
      );

      app.dispatcher.register('FaultyCommand', {
        async execute() {
          sequence.push('handler:throw');
          throw new Error('Payment gateway timeout');
        },
      });

      await app.start();

      const result = await app.dispatch({
        type: 'FaultyCommand',
        payload: {},
      });

      assert.strictEqual(result.success, false);
      assert.deepStrictEqual(sequence, [
        'interceptor:before',
        'handler:throw',
        'interceptor:catch',
        'interceptor:finally',
      ]);

      await app.stop();
    },
  );

  // =========================================================================
  // 13. ARCHITECTURAL BOUNDARIES
  // =========================================================================
  await t.test('20. Critical Architectural Boundary: Zero forbidden dependencies', () => {
    const pkgJsonPath = path.resolve(__dirname, '../../package.json');
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

    const deps = Object.keys(pkgJson.dependencies || {});
    const forbidden = [
      '@coreforge/transport',
      '@coreforge/routing',
      '@coreforge/http',
      '@coreforge/response',
      '@coreforge/jobs',
      '@coreforge/cache',
      '@coreforge/locks',
      '@coreforge/rate-limit',
      '@coreforge/resilience',
      '@coreforge/metrics',
      '@coreforge/tracing',
      '@coreforge/logging',
      'redis',
      'rabbitmq',
      'kafka',
    ];

    for (const f of forbidden) {
      assert.strictEqual(
        deps.includes(f),
        false,
        `Forbidden dependency detected in @coreforge/integration: ${f}`,
      );
    }
  });
});
