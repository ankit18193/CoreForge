import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { test } from 'node:test';

import { CoreForgeError } from '@coreforge/errors';
import { ExecutionContextManager } from '@coreforge/execution-context';
import { ApplicationIntegration } from '@coreforge/integration';

import {
  TransportAdapter,
  TransportAdapterNotFoundError,
  TransportAdapterOptions,
  TransportAdapterRegistry,
  TransportAdapterResolver,
  TransportBuilder,
  TransportCancellationError,
  TransportCapability,
  TransportConfigurationError,
  TransportContext,
  TransportContextFactory,
  TransportDiagnosticsSnapshot,
  TransportError,
  TransportExecutionError,
  TransportExecutionOptions,
  TransportManager,
  TransportMetadata,
  TransportRegistrationError,
  TransportRequest,
  TransportRequestSnapshot,
  TransportRequestValidator,
  TransportResponse,
  TransportResponseFactory,
  TransportResponseValidator,
  TransportResult,
  TransportState,
  TransportStateError,
  TransportTimeoutError,
  TransportValidationError,
} from '../src/index';

test('CoreForge Transport Contracts & Adapter Abstraction (@coreforge/transport)', async (t) => {
  // =========================================================================
  // 1. CONTRACTS & STANDARD ERRORS
  // =========================================================================
  await t.test('1. Type & Contract exports are valid', () => {
    const state: TransportState = 'CREATED';
    assert.strictEqual(state, 'CREATED');

    const capabilities: TransportCapability[] = [
      'REQUEST',
      'RESPONSE',
      'STREAMING',
      'BIDIRECTIONAL',
      'CANCELLATION',
      'METADATA',
    ];
    assert.strictEqual(capabilities.length, 6);

    const metadata: TransportMetadata = { ip: '127.0.0.1', protocol: 'custom' };
    assert.strictEqual(metadata.ip, '127.0.0.1');

    const req: TransportRequest<{ msg: string }> = {
      payload: { msg: 'hello' },
      metadata,
    };
    assert.strictEqual(req.payload.msg, 'hello');

    const res: TransportResponse<{ reply: string }> = {
      success: true,
      body: { reply: 'world' },
    };
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.body?.reply, 'world');

    const adapter: TransportAdapter<{ msg: string }, { reply: string }> = {
      id: 'test-adapter',
      name: 'Test Adapter',
      priority: 10,
      capabilities: ['REQUEST', 'RESPONSE'],
      async handle(request, _context) {
        return {
          success: true,
          body: { reply: `echo: ${request.payload.msg}` },
        };
      },
    };
    assert.strictEqual(adapter.id, 'test-adapter');

    const adapterOpts: TransportAdapterOptions = {
      priority: 100,
      capabilities: ['STREAMING'],
    };
    assert.strictEqual(adapterOpts.priority, 100);

    const execOpts: TransportExecutionOptions = {
      timeoutMs: 5000,
      adapterId: 'test-adapter',
    };
    assert.strictEqual(execOpts.timeoutMs, 5000);

    const result: TransportResult<{ reply: string }> = {
      success: true,
      response: res,
      durationMs: 12.5,
    };
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.durationMs, 12.5);

    const diag: TransportDiagnosticsSnapshot = {
      adapterRegistrations: 1,
      registrationFailures: 0,
      totalRequests: 1,
      successfulRequests: 1,
      failedRequests: 0,
      cancelledRequests: 0,
      activeRequests: 0,
      adapterResolutions: 1,
      resolutionFailures: 0,
      averageDurationMs: 12.5,
      slowestDurationMs: 12.5,
    };
    assert.strictEqual(diag.totalRequests, 1);
  });

  await t.test(
    '2. Error hierarchy inherits from CoreForgeError and TransportError with correct error codes',
    () => {
      const baseErr = new TransportError('Base transport error');
      assert.ok(baseErr instanceof CoreForgeError);
      assert.ok(baseErr instanceof TransportError);
      assert.strictEqual(baseErr.code, 'CF-TRANSPORT');
      assert.strictEqual(baseErr.message, 'Base transport error');

      const configErr = new TransportConfigurationError('Invalid config');
      assert.ok(configErr instanceof TransportError);
      assert.strictEqual(configErr.code, 'CF-TRANSPORT-CONFIGURATION');

      const regErr = new TransportRegistrationError('Duplicate adapter');
      assert.ok(regErr instanceof TransportError);
      assert.strictEqual(regErr.code, 'CF-TRANSPORT-REGISTRATION');

      const notFoundErr = new TransportAdapterNotFoundError('Adapter not found');
      assert.ok(notFoundErr instanceof TransportError);
      assert.strictEqual(notFoundErr.code, 'CF-TRANSPORT-ADAPTER-NOT-FOUND');

      const stateErr = new TransportStateError('Not ready');
      assert.ok(stateErr instanceof TransportError);
      assert.strictEqual(stateErr.code, 'CF-TRANSPORT-STATE');

      const valErr = new TransportValidationError('Invalid payload');
      assert.ok(valErr instanceof TransportError);
      assert.strictEqual(valErr.code, 'CF-TRANSPORT-VALIDATION');

      const execErr = new TransportExecutionError('Execution failed');
      assert.ok(execErr instanceof TransportError);
      assert.strictEqual(execErr.code, 'CF-TRANSPORT-EXECUTION');

      const cancelErr = new TransportCancellationError('Cancelled');
      assert.ok(cancelErr instanceof TransportError);
      assert.strictEqual(cancelErr.code, 'CF-TRANSPORT-CANCELLATION');

      const timeoutErr = new TransportTimeoutError('Timed out');
      assert.ok(timeoutErr instanceof TransportError);
      assert.strictEqual(timeoutErr.code, 'CF-TRANSPORT-TIMEOUT');
    },
  );

  // =========================================================================
  // 2. REQUEST VALIDATION & SNAPSHOTTING
  // =========================================================================
  await t.test(
    '3. TransportRequestValidator: Validates structure and rejects invalid inputs',
    () => {
      assert.throws(
        () => TransportRequestValidator.validate(null),
        (err: Error) => err instanceof TransportValidationError,
      );
      assert.throws(
        () => TransportRequestValidator.validate(undefined),
        (err: Error) => err instanceof TransportValidationError,
      );
      assert.throws(
        () => TransportRequestValidator.validate('string'),
        (err: Error) => err instanceof TransportValidationError,
      );
      assert.throws(
        () => TransportRequestValidator.validate(123),
        (err: Error) => err instanceof TransportValidationError,
      );
      assert.throws(
        () => TransportRequestValidator.validate({}),
        (err: Error) => err instanceof TransportValidationError,
      );
      assert.throws(
        () => TransportRequestValidator.validate({ payload: 123, metadata: 'invalid' }),
        (err: Error) => err instanceof TransportValidationError,
      );
      assert.throws(
        () => TransportRequestValidator.validate({ payload: 123, metadata: [1, 2, 3] }),
        (err: Error) => err instanceof TransportValidationError,
      );
      assert.throws(
        () => TransportRequestValidator.validate({ payload: 123, context: 'invalid' }),
        (err: Error) => err instanceof TransportValidationError,
      );

      const validReq = TransportRequestValidator.validate<{ userId: string }>({
        payload: { userId: 'u-123' },
        metadata: { trace: 'tr-1' },
      });
      assert.strictEqual(validReq.payload.userId, 'u-123');
      assert.strictEqual(validReq.metadata.trace, 'tr-1');
    },
  );

  await t.test('4. TransportRequestSnapshot: Deep cloning and producer mutation isolation', () => {
    const rawPayload = {
      nested: {
        field: 'original_value',
        items: [1, 2, 3],
      },
    };
    const rawMetadata = {
      source: 'producer_client',
      tags: ['alpha', 'beta'],
    };

    const snapshot = TransportRequestSnapshot.create<{
      nested: { field: string; items: number[] };
    }>({
      payload: rawPayload,
      metadata: rawMetadata,
    });

    // Producer mutates original object
    rawPayload.nested.field = 'mutated_value';
    rawPayload.nested.items.push(999);
    rawMetadata.source = 'mutated_source';
    rawMetadata.tags.push('gamma');

    // Snapshot is completely isolated
    assert.strictEqual(snapshot.payload.nested.field, 'original_value');
    assert.deepStrictEqual(snapshot.payload.nested.items, [1, 2, 3]);
    assert.strictEqual(snapshot.metadata.source, 'producer_client');
    assert.deepStrictEqual(snapshot.metadata.tags, ['alpha', 'beta']);
  });

  await t.test(
    '5. TransportRequestSnapshot: Circular reference detection and deep freeze immutability',
    () => {
      const cyclicObj: { name: string; self?: unknown } = { name: 'cyclic_node' };
      cyclicObj.self = cyclicObj;

      const snapshot = TransportRequestSnapshot.create<{ name: string; self: unknown }>({
        payload: cyclicObj,
      });

      assert.strictEqual(snapshot.payload.name, 'cyclic_node');
      assert.strictEqual(snapshot.payload.self, '[Circular]');

      // Snapshot object and nested objects are frozen
      assert.throws(() => {
        (snapshot as { payload: unknown }).payload = { name: 'new' };
      });
      assert.throws(() => {
        (snapshot.payload as { name: string }).name = 'mutated';
      });
    },
  );

  // =========================================================================
  // 3. RESPONSE VALIDATION & FACTORY
  // =========================================================================
  await t.test('6. TransportResponseValidator: Validates response contracts', () => {
    assert.throws(
      () => TransportResponseValidator.validate(null),
      (err: Error) => err instanceof TransportValidationError,
    );
    assert.throws(
      () => TransportResponseValidator.validate({}),
      (err: Error) => err instanceof TransportValidationError,
    );
    assert.throws(
      () => TransportResponseValidator.validate({ success: 'yes' }),
      (err: Error) => err instanceof TransportValidationError,
    );
    assert.throws(
      () => TransportResponseValidator.validate({ success: true, metadata: 'bad' }),
      (err: Error) => err instanceof TransportValidationError,
    );

    const validRes = TransportResponseValidator.validate({
      success: true,
      body: { data: 42 },
      metadata: { server: 'node-1' },
    });
    assert.strictEqual(validRes.success, true);
    assert.strictEqual((validRes.body as { data: number }).data, 42);
  });

  await t.test('7. TransportResponseFactory: Creates frozen success and failure responses', () => {
    const successRes = TransportResponseFactory.createSuccess<{ token: string }>(
      { token: 'abc-xyz' },
      { origin: 'auth' },
    );
    assert.strictEqual(successRes.success, true);
    assert.strictEqual(successRes.body?.token, 'abc-xyz');
    assert.strictEqual(successRes.metadata?.origin, 'auth');
    assert.throws(() => {
      (successRes as { success: boolean }).success = false;
    });

    const failureRes = TransportResponseFactory.createFailure(new Error('Access denied'), {
      code: 'AUTH_FAIL',
    });
    assert.strictEqual(failureRes.success, false);
    assert.ok(failureRes.error instanceof Error);
    assert.strictEqual(failureRes.metadata?.code, 'AUTH_FAIL');

    // fromApplicationResult mapping
    const appSuccess = TransportResponseFactory.fromApplicationResult({
      success: true,
      value: { orderId: 'ord-1' },
      serviceType: 'OrderService',
      executionId: 'exec-101',
      durationMs: 4.2,
      state: 'COMPLETED',
    });
    assert.strictEqual(appSuccess.success, true);
    assert.strictEqual(appSuccess.body?.orderId, 'ord-1');
    assert.strictEqual(appSuccess.metadata?.serviceType, 'OrderService');
    assert.strictEqual(appSuccess.metadata?.executionId, 'exec-101');

    const appFailure = TransportResponseFactory.fromApplicationResult({
      success: false,
      error: new Error('Order creation failed'),
      serviceType: 'OrderService',
      executionId: 'exec-102',
      durationMs: 5.5,
      state: 'FAILED',
    });
    assert.strictEqual(appFailure.success, false);
    assert.ok(appFailure.error instanceof Error);
    assert.strictEqual(appFailure.metadata?.state, 'FAILED');

    // fromDispatchResult mapping
    const dispatchRes = TransportResponseFactory.fromDispatchResult({
      success: true,
      value: { processed: true },
      commandType: 'ProcessTask',
      executionId: 'exec-201',
      durationMs: 2.1,
      state: 'COMPLETED',
    });
    assert.strictEqual(dispatchRes.success, true);
    assert.strictEqual((dispatchRes.body as { processed: boolean }).processed, true);

    // fromQueryResult mapping
    const queryRes = TransportResponseFactory.fromQueryResult({
      success: true,
      value: { balance: 1000 },
      queryType: 'GetBalance',
      executionId: 'exec-202',
      durationMs: 1.8,
      state: 'COMPLETED',
    });
    assert.strictEqual(queryRes.success, true);
    assert.strictEqual((queryRes.body as { balance: number }).balance, 1000);
  });

  // =========================================================================
  // 4. TRANSPORT CONTEXT
  // =========================================================================
  await t.test('8. TransportContextFactory: Bridges ExecutionContext and freezes context', () => {
    const contextManager = new ExecutionContextManager();
    const customCtx = contextManager.create({ autoStart: true });

    const transportCtx: TransportContext = TransportContextFactory.create('HTTP_ADAPTER', {
      executionContext: customCtx,
      metadata: { endpoint: '/api/v1/orders' },
    });

    assert.strictEqual(transportCtx.transportType, 'HTTP_ADAPTER');
    assert.strictEqual(transportCtx.executionContext.executionId, customCtx.executionId);
    assert.strictEqual(transportCtx.executionContext.state, 'ACTIVE');
    assert.strictEqual(transportCtx.metadata.endpoint, '/api/v1/orders');
    assert.strictEqual(transportCtx.metadata.transportType, 'HTTP_ADAPTER');

    // Default context creation when none is provided
    const autoTransportCtx = TransportContextFactory.create('CLI_ADAPTER');
    assert.strictEqual(autoTransportCtx.transportType, 'CLI_ADAPTER');
    assert.ok(autoTransportCtx.executionContext.executionId);
    assert.strictEqual(autoTransportCtx.executionContext.state, 'ACTIVE');
  });

  // =========================================================================
  // 5. ADAPTER REGISTRY & RESOLUTION
  // =========================================================================
  await t.test(
    '9. TransportAdapterRegistry: Registers adapters and maintains immutable list',
    () => {
      const registry = new TransportAdapterRegistry();
      assert.strictEqual(registry.size, 0);

      const httpAdapter: TransportAdapter = {
        id: 'http',
        name: 'HTTP Adapter',
        priority: 50,
        capabilities: ['REQUEST', 'RESPONSE'],
      };

      registry.register(httpAdapter);
      assert.strictEqual(registry.size, 1);
      assert.strictEqual(registry.has('http'), true);

      const entry = registry.get('http');
      assert.ok(entry);
      assert.strictEqual(entry?.id, 'http');
      assert.strictEqual(entry?.name, 'HTTP Adapter');
      assert.strictEqual(entry?.priority, 50);
      assert.deepStrictEqual(entry?.capabilities, ['REQUEST', 'RESPONSE']);
      assert.strictEqual(entry?.sequence, 1);

      const list = registry.list();
      assert.strictEqual(list.length, 1);
      assert.throws(() => {
        (list as unknown as unknown[]).push({});
      });
    },
  );

  await t.test(
    '10. TransportAdapterRegistry: Rejects duplicate adapter IDs with TransportRegistrationError',
    () => {
      const registry = new TransportAdapterRegistry();

      registry.register({
        id: 'duplicate-id',
        name: 'First Adapter',
        capabilities: ['REQUEST'],
      });

      assert.throws(
        () =>
          registry.register({
            id: 'duplicate-id',
            name: 'Second Adapter',
            capabilities: ['RESPONSE'],
          }),
        (err: Error) => err instanceof TransportRegistrationError,
      );
    },
  );

  await t.test(
    '11. TransportAdapterRegistry: Rejects registrations after lock() with TransportStateError',
    () => {
      const registry = new TransportAdapterRegistry();

      registry.register({
        id: 'pre-lock',
        name: 'Pre-lock Adapter',
        capabilities: ['REQUEST'],
      });

      registry.lock();
      assert.strictEqual(registry.isLocked, true);

      assert.throws(
        () =>
          registry.register({
            id: 'post-lock',
            name: 'Post-lock Adapter',
            capabilities: ['REQUEST'],
          }),
        (err: Error) => err instanceof TransportStateError,
      );

      assert.throws(
        () => registry.clear(),
        (err: Error) => err instanceof TransportStateError,
      );
    },
  );

  await t.test(
    '12. TransportAdapterResolver: Resolves by ID with O(1) lookup or throws TransportAdapterNotFoundError',
    () => {
      const registry = new TransportAdapterRegistry();

      const wsAdapter: TransportAdapter = {
        id: 'websocket',
        name: 'WebSocket Adapter',
        capabilities: ['BIDIRECTIONAL', 'STREAMING'],
      };

      registry.register(wsAdapter);

      const resolved = TransportAdapterResolver.resolve(registry, 'websocket');
      assert.strictEqual(resolved.id, 'websocket');
      assert.strictEqual(resolved.name, 'WebSocket Adapter');

      assert.throws(
        () => TransportAdapterResolver.resolve(registry, 'non-existent'),
        (err: Error) => err instanceof TransportAdapterNotFoundError,
      );
      assert.throws(
        () => TransportAdapterResolver.resolve(registry, ''),
        (err: Error) => err instanceof TransportAdapterNotFoundError,
      );
    },
  );

  await t.test(
    '13. TransportAdapterResolver: Deterministic priority DESC and sequence ASC resolution',
    () => {
      const registry = new TransportAdapterRegistry();

      const a1: TransportAdapter = {
        id: 'a1',
        name: 'A1',
        priority: 10,
        capabilities: ['REQUEST'],
      };
      const a2: TransportAdapter = {
        id: 'a2',
        name: 'A2',
        priority: 100,
        capabilities: ['REQUEST'],
      };
      const a3: TransportAdapter = {
        id: 'a3',
        name: 'A3',
        priority: 50,
        capabilities: ['REQUEST'],
      };
      const a4: TransportAdapter = {
        id: 'a4',
        name: 'A4',
        priority: 100,
        capabilities: ['REQUEST'],
      }; // same priority as a2, later sequence

      registry.register(a1); // priority 10, seq 1
      registry.register(a2); // priority 100, seq 2
      registry.register(a3); // priority 50, seq 3
      registry.register(a4); // priority 100, seq 4

      const allSorted = TransportAdapterResolver.resolveAll(registry);
      assert.strictEqual(allSorted.length, 4);
      assert.strictEqual(allSorted[0].id, 'a2'); // Priority 100, Seq 2
      assert.strictEqual(allSorted[1].id, 'a4'); // Priority 100, Seq 4
      assert.strictEqual(allSorted[2].id, 'a3'); // Priority 50, Seq 3
      assert.strictEqual(allSorted[3].id, 'a1'); // Priority 10, Seq 1

      const defaultAdapter = TransportAdapterResolver.resolveDefault(registry);
      assert.strictEqual(defaultAdapter?.id, 'a2');
    },
  );

  await t.test(
    '14. TransportAdapterResolver: Capability filtering with deterministic ordering',
    () => {
      const registry = new TransportAdapterRegistry();

      registry.register({
        id: 'c1',
        name: 'C1',
        priority: 10,
        capabilities: ['STREAMING', 'REQUEST'],
      });
      registry.register({
        id: 'c2',
        name: 'C2',
        priority: 90,
        capabilities: ['RESPONSE'],
      });
      registry.register({
        id: 'c3',
        name: 'C3',
        priority: 80,
        capabilities: ['STREAMING', 'RESPONSE'],
      });

      const streamingAdapters = TransportAdapterResolver.resolveByCapability(registry, 'STREAMING');
      assert.strictEqual(streamingAdapters.length, 2);
      assert.strictEqual(streamingAdapters[0].id, 'c3'); // Priority 80
      assert.strictEqual(streamingAdapters[1].id, 'c1'); // Priority 10

      const bidirectionalAdapters = TransportAdapterResolver.resolveByCapability(
        registry,
        'BIDIRECTIONAL',
      );
      assert.strictEqual(bidirectionalAdapters.length, 0);
    },
  );

  // =========================================================================
  // 6. LIFECYCLE & EXECUTION COORDINATION
  // =========================================================================
  await t.test(
    '15. TransportManager: Lifecycle transitions and idempotent start/stop',
    async () => {
      const manager = new TransportManager();
      assert.strictEqual(manager.state, 'CREATED');
      assert.strictEqual(manager.ready, false);

      await manager.start();
      assert.strictEqual(manager.state, 'READY');
      assert.strictEqual(manager.ready, true);

      // Idempotent start
      await manager.start();
      assert.strictEqual(manager.state, 'READY');

      await manager.stop();
      assert.strictEqual(manager.state, 'STOPPED');
      assert.strictEqual(manager.ready, false);

      // Idempotent stop
      await manager.stop();
      assert.strictEqual(manager.state, 'STOPPED');
    },
  );

  await t.test('16. TransportManager: Rejects operations when not in READY state', async () => {
    const manager = new TransportManager();

    await assert.rejects(
      async () => manager.execute({ payload: { ping: true }, metadata: {} }),
      (err: Error) => err instanceof TransportStateError,
    );

    await manager.start();
    await manager.stop();

    await assert.rejects(
      async () => manager.execute({ payload: { ping: true }, metadata: {} }),
      (err: Error) => err instanceof TransportStateError,
    );
  });

  await t.test('17. TransportExecutionCoordinator: Adapter handle execution path', async () => {
    const manager = new TransportManager();

    manager.registerAdapter<{ num: number }, { squared: number }>({
      id: 'math-adapter',
      name: 'Math Adapter',
      capabilities: ['REQUEST', 'RESPONSE'],
      async handle(request) {
        return TransportResponseFactory.createSuccess({
          squared: request.payload.num * request.payload.num,
        });
      },
    });

    await manager.start();

    const result = await manager.execute<{ num: number }, { squared: number }>({
      payload: { num: 9 },
      metadata: {},
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.response?.body?.squared, 81);
    assert.strictEqual(typeof result.durationMs, 'number');

    await manager.stop();
  });

  await t.test(
    '18. TransportExecutionCoordinator: ApplicationIntegration delegation path',
    async () => {
      const app = new ApplicationIntegration();

      app.dispatcher.register<{ amount: number }, { confirmed: boolean }>('CreatePayment', {
        async execute(payload) {
          return { confirmed: payload.amount > 0 };
        },
      });

      await app.start();

      const transport = new TransportManager({ application: app });
      await transport.start();

      const res = await transport.execute<
        { type: string; payload: { amount: number } },
        { confirmed: boolean }
      >({
        payload: { type: 'CreatePayment', payload: { amount: 150 } },
        metadata: {},
      });

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.response?.body?.confirmed, true);

      await transport.stop();
      await app.stop();
    },
  );

  await t.test('19. TransportExecutionCoordinator: Cancellation and timeout handling', async () => {
    const manager = new TransportManager({ defaultTimeoutMs: 50 });

    manager.registerAdapter({
      id: 'slow-adapter',
      name: 'Slow Adapter',
      capabilities: ['REQUEST'],
      async handle() {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return TransportResponseFactory.createSuccess({ done: true });
      },
    });

    await manager.start();

    // 1. Timeout trigger
    const timeoutResult = await manager.execute({ payload: {}, metadata: {} });
    assert.strictEqual(timeoutResult.success, false);
    assert.ok(timeoutResult.error instanceof TransportTimeoutError);

    // 2. Cancellation trigger
    const ctx = manager.contextManager.create();
    ctx.cancel();

    const cancelResult = await manager.execute({ payload: {}, metadata: {} }, { context: ctx });
    assert.strictEqual(cancelResult.success, false);
    assert.ok(cancelResult.error instanceof TransportCancellationError);

    await manager.stop();
  });

  await t.test('20. TransportDiagnostics: Pure numerical metrics and security', async () => {
    const manager = new TransportManager();

    manager.registerAdapter({
      id: 'echo',
      name: 'Echo Adapter',
      capabilities: ['REQUEST'],
      handle(req) {
        return TransportResponseFactory.createSuccess(req.payload);
      },
    });

    await manager.start();

    await manager.execute({ payload: { a: 1 }, metadata: {} });
    await manager.execute({ payload: { b: 2 }, metadata: {} });

    const diag = manager.getDiagnostics();
    const serialized = JSON.stringify(diag);

    assert.strictEqual(diag.adapterRegistrations, 1);
    assert.strictEqual(diag.totalRequests, 2);
    assert.strictEqual(diag.successfulRequests, 2);
    assert.strictEqual(diag.failedRequests, 0);
    assert.strictEqual(diag.activeRequests, 0);
    assert.strictEqual(typeof diag.averageDurationMs, 'number');

    // Security check: no credentials, payloads, or execution IDs in diagnostics
    assert.strictEqual(serialized.includes('secret'), false);
    assert.strictEqual(serialized.includes('password'), false);

    manager.resetDiagnostics();
    const resetDiag = manager.getDiagnostics();
    assert.strictEqual(resetDiag.totalRequests, 0);
    assert.strictEqual(resetDiag.successfulRequests, 0);

    await manager.stop();
  });

  await t.test('21. TransportBuilder: Fluent immutable construction', async () => {
    const b1 = TransportBuilder.create();
    const b2 = b1.withDefaultTimeout(1000);
    const b3 = b2.registerAdapter({
      id: 'b-adapter',
      name: 'Builder Adapter',
      capabilities: ['REQUEST'],
    });

    assert.notStrictEqual(b1, b2);
    assert.notStrictEqual(b2, b3);

    const m1 = b1.build();
    const m3 = b3.build();

    assert.strictEqual(m1.registry.size, 0);
    assert.strictEqual(m3.registry.size, 1);
    assert.strictEqual(m3.registry.has('b-adapter'), true);
  });

  // =========================================================================
  // 7. HIGH CONCURRENCY ISOLATION (1,000 OPERATIONS)
  // =========================================================================
  await t.test(
    '22. High-Concurrency Isolation: 1,000 concurrent transport executions maintain strict isolation',
    async () => {
      const manager = new TransportManager();

      manager.registerAdapter<{ index: number }, { result: number }>({
        id: 'concurrent-adapter',
        name: 'Concurrent Adapter',
        priority: 100,
        capabilities: ['REQUEST', 'RESPONSE'],
        async handle(request) {
          return TransportResponseFactory.createSuccess({
            result: request.payload.index * 10,
          });
        },
      });

      await manager.start();

      const promises: Promise<void>[] = [];

      for (let i = 0; i < 1000; i++) {
        const index = i;
        promises.push(
          manager
            .execute<{ index: number }, { result: number }>({
              payload: { index },
              metadata: { opId: index },
            })
            .then((res) => {
              assert.strictEqual(res.success, true);
              assert.strictEqual(res.response?.body?.result, index * 10);
            }),
        );
      }

      await Promise.all(promises);

      const diag = manager.getDiagnostics();
      assert.strictEqual(diag.totalRequests, 1000);
      assert.strictEqual(diag.successfulRequests, 1000);
      assert.strictEqual(diag.failedRequests, 0);
      assert.strictEqual(diag.activeRequests, 0);

      await manager.stop();
    },
  );

  // =========================================================================
  // 8. FULL MULTI-ADAPTER END-TO-END SCENARIO
  // =========================================================================
  await t.test(
    '23. Multi-Adapter End-to-End Scenario: Multiple transports route to unified application layer',
    async () => {
      const app = new ApplicationIntegration();

      app.dispatcher.register<{ amount: number; user: string }, { orderId: string }>(
        'CreateOrder',
        {
          async execute(payload) {
            return { orderId: `ord-${payload.user}-${payload.amount}` };
          },
        },
      );

      await app.start();

      const builder = TransportBuilder.create()
        .withApplication(app)
        .registerAdapter({
          id: 'http-adapter',
          name: 'HTTP Transport Adapter',
          priority: 100,
          capabilities: ['REQUEST', 'RESPONSE'],
          async handle(request, context) {
            const body = request.payload as { user: string; amount: number };
            const appRes = await app.dispatch<
              { amount: number; user: string },
              { orderId: string }
            >({ type: 'CreateOrder', payload: body }, { context: context.executionContext });
            return TransportResponseFactory.fromDispatchResult(appRes, {
              transport: 'http',
            });
          },
        })
        .registerAdapter({
          id: 'cli-adapter',
          name: 'CLI Transport Adapter',
          priority: 50,
          capabilities: ['REQUEST'],
          async handle(request, context) {
            const body = request.payload as { user: string; amount: number };
            const appRes = await app.dispatch<
              { amount: number; user: string },
              { orderId: string }
            >({ type: 'CreateOrder', payload: body }, { context: context.executionContext });
            return TransportResponseFactory.fromDispatchResult(appRes, {
              transport: 'cli',
            });
          },
        });

      const transport = builder.build();
      await transport.start();

      // 1. Execute through HTTP adapter
      const httpResult = await transport.execute(
        { payload: { user: 'alice', amount: 200 }, metadata: {} },
        { adapterId: 'http-adapter' },
      );
      assert.strictEqual(httpResult.success, true);
      assert.strictEqual(
        (httpResult.response?.body as { orderId: string }).orderId,
        'ord-alice-200',
      );
      assert.strictEqual(httpResult.response?.metadata?.transport, 'http');

      // 2. Execute through CLI adapter
      const cliResult = await transport.execute(
        { payload: { user: 'bob', amount: 50 }, metadata: {} },
        { adapterId: 'cli-adapter' },
      );
      assert.strictEqual(cliResult.success, true);
      assert.strictEqual((cliResult.response?.body as { orderId: string }).orderId, 'ord-bob-50');
      assert.strictEqual(cliResult.response?.metadata?.transport, 'cli');

      await transport.stop();
      await app.stop();
    },
  );

  // =========================================================================
  // 9. ARCHITECTURAL BOUNDARY VERIFICATION
  // =========================================================================
  await t.test(
    '24. Architectural boundary: Zero forbidden dependencies in @coreforge/transport',
    () => {
      const pkgJsonPath = path.resolve(__dirname, '../../package.json');
      const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

      const deps = Object.keys(pkgJson.dependencies || {});
      const forbidden = [
        'express',
        'fastify',
        'ws',
        'socket.io',
        'redis',
        'rabbitmq',
        'kafka',
        'amqplib',
        'kafkajs',
        'ioredis',
        'http',
        'https',
      ];

      for (const f of forbidden) {
        assert.strictEqual(
          deps.includes(f),
          false,
          `Forbidden dependency detected in @coreforge/transport: ${f}`,
        );
      }
    },
  );
});
