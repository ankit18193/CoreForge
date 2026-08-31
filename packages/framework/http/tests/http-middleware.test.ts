import * as assert from 'node:assert';
import { test } from 'node:test';

import type {
  ExecutionContext,
  HttpMiddleware,
  HttpMiddlewareBatchResult,
  HttpMiddlewareContext,
  HttpMiddlewareDiagnosticsSnapshot,
  HttpMiddlewareFailureStrategy,
  HttpMiddlewareNext,
  HttpMiddlewareOptions,
  HttpMiddlewareRegistry as IHttpMiddlewareRegistry,
  HttpMiddlewareResolver as IHttpMiddlewareResolver,
  HttpMiddlewareResult,
  HttpMiddlewareResultState,
  HttpMiddlewareRouteInfo,
  HttpMiddlewareState,
  HttpRequest,
  HttpResponse,
} from '@coreforge/contracts';
import { CoreForgeError } from '@coreforge/errors';
import { ApplicationIntegrationBuilder } from '@coreforge/integration';

import {
  HttpError,
  HttpMiddlewareCancellationError,
  HttpMiddlewareConfigurationError,
  HttpMiddlewareCoordinator,
  HttpMiddlewareDiagnostics,
  HttpMiddlewareDuplicateError,
  HttpMiddlewareError,
  HttpMiddlewareExecutionError,
  HttpMiddlewareExecutor,
  HttpMiddlewarePipeline,
  HttpMiddlewarePipelineError,
  HttpMiddlewareProfiler,
  HttpMiddlewareRegistrationError,
  HttpMiddlewareRegistry,
  HttpMiddlewareResolver,
  HttpMiddlewareSnapshot,
  HttpMiddlewareStateError,
  HttpMiddlewareTimeoutError,
  HttpMiddlewareValidationError,
  HttpMiddlewareValidator,
  HttpRouter,
  HttpRoutingCoordinator,
  HttpTransportBuilder,
  HttpTransportManager,
} from '../src/index';

test('CoreForge HTTP Middleware Engine (@coreforge/http) — Stages 1-4: Middleware Pipeline & Routing Integration', async (t) => {
  // =========================================================================
  // 1. CONTRACTS & TYPES
  // =========================================================================
  await t.test('1. Middleware contract types and interfaces are valid', () => {
    const state: HttpMiddlewareState = 'CREATED';
    assert.strictEqual(state, 'CREATED');

    const failureStrategy: HttpMiddlewareFailureStrategy = 'CONTINUE';
    assert.strictEqual(failureStrategy, 'CONTINUE');

    const resultState: HttpMiddlewareResultState = 'COMPLETED';
    assert.strictEqual(resultState, 'COMPLETED');

    const routeInfo: HttpMiddlewareRouteInfo = {
      id: 'get-users',
      method: 'GET',
      path: '/api/v1/users',
      operation: 'users.list',
      metadata: { role: 'admin' },
    };
    assert.strictEqual(routeInfo.id, 'get-users');
    assert.strictEqual(routeInfo.operation, 'users.list');

    const dummyRequest: HttpRequest = {
      method: 'GET',
      url: '/api/v1/users',
      path: '/api/v1/users',
      headers: { 'content-type': 'application/json' },
    };

    const dummyContext: HttpMiddlewareContext = {
      request: dummyRequest,
      route: routeInfo,
      parameters: { id: '123' },
      executionContext: {
        id: 'exec-1',
        traceId: 'trace-1',
        correlationId: 'corr-1',
        startTime: Date.now(),
        signal: new AbortController().signal,
        metadata: {},
        get: () => undefined,
        set: () => {},
        has: () => false,
      } as unknown as ExecutionContext,
      metadata: { custom: true },
    };
    assert.strictEqual(dummyContext.parameters.id, '123');

    const dummyMiddleware: HttpMiddleware = {
      id: 'auth-mw',
      name: 'AuthMiddleware',
      priority: 100,
      execute: async (_ctx, next) => {
        return next();
      },
    };
    assert.strictEqual(dummyMiddleware.id, 'auth-mw');
    assert.strictEqual(dummyMiddleware.priority, 100);

    const dummyOptions: HttpMiddlewareOptions = {
      priority: 50,
      enabled: true,
      failureStrategy: 'FAIL_FAST',
      timeoutMs: 5000,
    };
    assert.strictEqual(dummyOptions.failureStrategy, 'FAIL_FAST');

    const dummyResult: HttpMiddlewareResult = {
      middlewareId: 'auth-mw',
      state: 'COMPLETED',
      success: true,
      durationMs: 1.25,
      value: { ok: true },
    };
    assert.strictEqual(dummyResult.success, true);

    const dummyBatch: HttpMiddlewareBatchResult = {
      success: true,
      results: [dummyResult],
      totalMiddleware: 1,
      executedMiddleware: 1,
      failedMiddleware: 0,
      skippedMiddleware: 0,
      cancelledMiddleware: 0,
      durationMs: 1.25,
    };
    assert.strictEqual(dummyBatch.totalMiddleware, 1);

    const dummyDiagnostics: HttpMiddlewareDiagnosticsSnapshot = {
      totalExecutions: 10,
      successfulExecutions: 9,
      failedExecutions: 1,
      cancelledExecutions: 0,
      skippedExecutions: 0,
      activeExecutions: 0,
      registrationFailures: 0,
      averageDurationMs: 0.85,
      slowestDurationMs: 2.1,
    };
    assert.strictEqual(dummyDiagnostics.totalExecutions, 10);
    assert.strictEqual(dummyDiagnostics.failedExecutions, 1);

    const dummyRegistry: IHttpMiddlewareRegistry = {
      size: 1,
      locked: false,
      register(_mw, _opts) {},
      get(_id) {
        return dummyMiddleware;
      },
      list() {
        return [dummyMiddleware];
      },
      lock() {},
    };
    assert.strictEqual(dummyRegistry.size, 1);

    const dummyResolver: IHttpMiddlewareResolver = {
      resolve() {
        return [dummyMiddleware];
      },
    };
    assert.strictEqual(dummyResolver.resolve().length, 1);
  });

  // =========================================================================
  // 2. ERROR HIERARCHY
  // =========================================================================
  await t.test(
    '2. Middleware error hierarchy inherits correctly with expected codes and properties',
    () => {
      const baseErr = new HttpMiddlewareError('Base middleware error');
      assert.ok(baseErr instanceof CoreForgeError);
      assert.ok(baseErr instanceof HttpError);
      assert.ok(baseErr instanceof HttpMiddlewareError);
      assert.strictEqual(baseErr.code, 'CF-HTTP-MIDDLEWARE');
      assert.strictEqual(baseErr.name, 'HttpMiddlewareError');

      const configErr = new HttpMiddlewareConfigurationError('Config error');
      assert.ok(configErr instanceof HttpMiddlewareError);
      assert.strictEqual(configErr.code, 'CF-HTTP-MIDDLEWARE-CONFIG');
      assert.strictEqual(configErr.name, 'HttpMiddlewareConfigurationError');

      const regErr = new HttpMiddlewareRegistrationError('Registration failed');
      assert.ok(regErr instanceof HttpMiddlewareError);
      assert.strictEqual(regErr.code, 'CF-HTTP-MIDDLEWARE-REGISTRATION');
      assert.strictEqual(regErr.name, 'HttpMiddlewareRegistrationError');

      const dupErr = new HttpMiddlewareDuplicateError('mw-1');
      assert.ok(dupErr instanceof HttpMiddlewareError);
      assert.strictEqual(dupErr.code, 'CF-HTTP-MIDDLEWARE-DUPLICATE');
      assert.strictEqual(dupErr.name, 'HttpMiddlewareDuplicateError');
      assert.strictEqual(dupErr.middlewareId, 'mw-1');
      assert.ok(dupErr.message.includes('mw-1'));

      const valErr = new HttpMiddlewareValidationError('Validation error');
      assert.ok(valErr instanceof HttpMiddlewareError);
      assert.strictEqual(valErr.code, 'CF-HTTP-MIDDLEWARE-VALIDATION');
      assert.strictEqual(valErr.name, 'HttpMiddlewareValidationError');

      const stateErr = new HttpMiddlewareStateError('State error');
      assert.ok(stateErr instanceof HttpMiddlewareError);
      assert.strictEqual(stateErr.code, 'CF-HTTP-MIDDLEWARE-STATE');
      assert.strictEqual(stateErr.name, 'HttpMiddlewareStateError');

      const execErr = new HttpMiddlewareExecutionError('Execution error', 'mw-2');
      assert.ok(execErr instanceof HttpMiddlewareError);
      assert.strictEqual(execErr.code, 'CF-HTTP-MIDDLEWARE-EXECUTION');
      assert.strictEqual(execErr.name, 'HttpMiddlewareExecutionError');
      assert.strictEqual(execErr.middlewareId, 'mw-2');

      const cancelErr = new HttpMiddlewareCancellationError('Cancelled', 'mw-3');
      assert.ok(cancelErr instanceof HttpMiddlewareError);
      assert.strictEqual(cancelErr.code, 'CF-HTTP-MIDDLEWARE-CANCELLATION');
      assert.strictEqual(cancelErr.name, 'HttpMiddlewareCancellationError');
      assert.strictEqual(cancelErr.middlewareId, 'mw-3');

      const timeoutErr = new HttpMiddlewareTimeoutError('Timed out', 'mw-4', 3000);
      assert.ok(timeoutErr instanceof HttpMiddlewareError);
      assert.strictEqual(timeoutErr.code, 'CF-HTTP-MIDDLEWARE-TIMEOUT');
      assert.strictEqual(timeoutErr.name, 'HttpMiddlewareTimeoutError');
      assert.strictEqual(timeoutErr.middlewareId, 'mw-4');
      assert.strictEqual(timeoutErr.timeoutMs, 3000);

      const pipeErr = new HttpMiddlewarePipelineError('Pipeline broken');
      assert.ok(pipeErr instanceof HttpMiddlewareError);
      assert.strictEqual(pipeErr.code, 'CF-HTTP-MIDDLEWARE-PIPELINE');
      assert.strictEqual(pipeErr.name, 'HttpMiddlewarePipelineError');
    },
  );

  // =========================================================================
  // 3. MIDDLEWARE VALIDATOR
  // =========================================================================
  await t.test(
    '3. HttpMiddlewareValidator validates structure and rejects invalid definitions',
    () => {
      // Valid middleware
      const valid = HttpMiddlewareValidator.validate({
        id: 'logger',
        name: 'RequestLogger',
        priority: 10,
        execute: (_ctx: unknown, next: HttpMiddlewareNext) => next(),
      });
      assert.strictEqual(valid.id, 'logger');

      // Valid with options
      const validWithOptions = HttpMiddlewareValidator.validate(
        {
          id: 'auth',
          execute: (_ctx: unknown, next: HttpMiddlewareNext) => next(),
        },
        {
          priority: 50,
          enabled: true,
          failureStrategy: 'CONTINUE',
          timeoutMs: 1000,
        },
      );
      assert.strictEqual(validWithOptions.id, 'auth');

      // Invalid: null / non-object
      assert.throws(() => HttpMiddlewareValidator.validate(null), HttpMiddlewareValidationError);
      assert.throws(
        () => HttpMiddlewareValidator.validate('not-an-object'),
        HttpMiddlewareValidationError,
      );

      // Invalid ID
      assert.throws(
        () =>
          HttpMiddlewareValidator.validate({
            id: '',
            execute: () => {},
          }),
        HttpMiddlewareValidationError,
      );
      assert.throws(
        () =>
          HttpMiddlewareValidator.validate({
            id: '   ',
            execute: () => {},
          }),
        HttpMiddlewareValidationError,
      );
      assert.throws(
        () =>
          HttpMiddlewareValidator.validate({
            id: 123,
            execute: () => {},
          }),
        HttpMiddlewareValidationError,
      );

      // Invalid execute function
      assert.throws(
        () =>
          HttpMiddlewareValidator.validate({
            id: 'no-execute',
          }),
        HttpMiddlewareValidationError,
      );
      assert.throws(
        () =>
          HttpMiddlewareValidator.validate({
            id: 'bad-execute',
            execute: 'not-a-function',
          }),
        HttpMiddlewareValidationError,
      );

      // Invalid priority
      assert.throws(
        () =>
          HttpMiddlewareValidator.validate({
            id: 'bad-priority',
            priority: NaN,
            execute: () => {},
          }),
        HttpMiddlewareValidationError,
      );
      assert.throws(
        () =>
          HttpMiddlewareValidator.validate({
            id: 'bad-priority-2',
            priority: Infinity,
            execute: () => {},
          }),
        HttpMiddlewareValidationError,
      );

      // Invalid options: failureStrategy
      assert.throws(
        () =>
          HttpMiddlewareValidator.validate(
            {
              id: 'test-mw',
              execute: () => {},
            },
            {
              failureStrategy: 'INVALID' as unknown as HttpMiddlewareFailureStrategy,
            },
          ),
        HttpMiddlewareValidationError,
      );

      // Invalid options: timeoutMs
      assert.throws(
        () =>
          HttpMiddlewareValidator.validate(
            {
              id: 'test-mw',
              execute: () => {},
            },
            {
              timeoutMs: -50,
            },
          ),
        HttpMiddlewareValidationError,
      );
    },
  );

  // =========================================================================
  // 4. MIDDLEWARE SNAPSHOT & IMMUTABILITY
  // =========================================================================
  await t.test(
    '4. HttpMiddlewareSnapshot creates deeply immutable snapshots and handles circular references',
    () => {
      const rawReq: HttpRequest = {
        method: 'POST',
        url: '/api/v1/items',
        path: '/api/v1/items',
        headers: { authorization: 'Bearer token-xyz' },
        body: { itemName: 'widget', count: 5 },
      };

      const circularObj: Record<string, unknown> = { key: 'value' };
      circularObj.self = circularObj;

      const context: HttpMiddlewareContext = {
        request: rawReq,
        route: {
          id: 'post-item',
          method: 'POST',
          path: '/api/v1/items',
          operation: 'items.create',
          metadata: { sensitive: false, circular: circularObj },
        },
        parameters: { category: 'tools' },
        executionContext: {
          id: 'exec-100',
          traceId: 'tr-100',
          correlationId: 'cr-100',
          startTime: Date.now(),
          signal: new AbortController().signal,
          metadata: {},
          get: () => undefined,
          set: () => {},
          has: () => false,
        } as unknown as ExecutionContext,
        metadata: { env: 'production', circular: circularObj },
      };

      const snapshot = HttpMiddlewareSnapshot.createContext(context);

      // Verify deep freeze
      assert.ok(Object.isFrozen(snapshot));
      assert.ok(Object.isFrozen(snapshot.parameters));
      assert.ok(Object.isFrozen(snapshot.metadata));
      assert.ok(Object.isFrozen(snapshot.request));
      assert.ok(Object.isFrozen(snapshot.route));
      assert.ok(Object.isFrozen(snapshot.route?.metadata));

      // Verify circular references sanitized
      assert.strictEqual(
        (snapshot.metadata.circular as Record<string, unknown>).self,
        '[Circular]',
      );
      assert.strictEqual(
        (snapshot.route?.metadata?.circular as Record<string, unknown>).self,
        '[Circular]',
      );

      // Verify results and batch snapshots
      const resSnapshot = HttpMiddlewareSnapshot.createResult({
        middlewareId: 'mw-1',
        state: 'COMPLETED',
        success: true,
        durationMs: 5.5,
        value: { foo: 'bar' },
      });
      assert.ok(Object.isFrozen(resSnapshot));
      assert.strictEqual(resSnapshot.middlewareId, 'mw-1');

      const batchSnapshot = HttpMiddlewareSnapshot.createBatchResult({
        success: true,
        results: [resSnapshot],
        totalMiddleware: 1,
        executedMiddleware: 1,
        failedMiddleware: 0,
        skippedMiddleware: 0,
        cancelledMiddleware: 0,
        durationMs: 5.5,
      });
      assert.ok(Object.isFrozen(batchSnapshot));
      assert.ok(Object.isFrozen(batchSnapshot.results));
      assert.strictEqual(batchSnapshot.totalMiddleware, 1);
    },
  );

  // =========================================================================
  // 5. DETERMINISTIC MIDDLEWARE REGISTRY
  // =========================================================================
  await t.test(
    '5. HttpMiddlewareRegistry: Registration, O(1) retrieval, duplicate prevention, and locking',
    () => {
      const registry = new HttpMiddlewareRegistry();
      assert.strictEqual(registry.size, 0);
      assert.strictEqual(registry.locked, false);

      const mwA: HttpMiddleware = {
        id: 'mw-a',
        priority: 10,
        execute: (_ctx, next) => next(),
      };
      const mwB: HttpMiddleware = {
        id: 'mw-b',
        priority: 20,
        execute: (_ctx, next) => next(),
      };

      registry.register(mwA);
      registry.register(mwB, { priority: 25, failureStrategy: 'CONTINUE' });

      assert.strictEqual(registry.size, 2);
      assert.strictEqual(registry.has('mw-a'), true);
      assert.strictEqual(registry.has('mw-b'), true);
      assert.strictEqual(registry.has('mw-nonexistent'), false);

      assert.strictEqual(registry.get('mw-a')?.id, 'mw-a');
      assert.strictEqual(registry.getEntry('mw-b')?.priority, 25);
      assert.strictEqual(registry.getEntry('mw-b')?.failureStrategy, 'CONTINUE');
      assert.strictEqual(registry.getEntry('mw-a')?.sequence, 1);
      assert.strictEqual(registry.getEntry('mw-b')?.sequence, 2);

      // Duplicate registration rejection
      assert.throws(
        () => registry.register({ id: 'mw-a', execute: (_ctx, next) => next() }),
        HttpMiddlewareDuplicateError,
      );

      // Locking
      registry.lock();
      assert.strictEqual(registry.locked, true);

      assert.throws(
        () => registry.register({ id: 'mw-c', execute: (_ctx, next) => next() }),
        HttpMiddlewareRegistrationError,
      );

      assert.throws(() => registry.clear(), HttpMiddlewareRegistrationError);
    },
  );

  // =========================================================================
  // 6. DETERMINISTIC MIDDLEWARE RESOLVER
  // =========================================================================
  await t.test(
    '6. HttpMiddlewareResolver: Deterministic resolution by priority DESC and registration sequence ASC',
    () => {
      const registry = new HttpMiddlewareRegistry();

      // Register out of order
      // Middleware A: priority 100, sequence 1
      // Middleware B: priority 50, sequence 2
      // Middleware C: priority 50, sequence 3
      // Middleware D: priority 10, sequence 4
      // Middleware E: priority 150, sequence 5
      registry.register({ id: 'mw-a', execute: (_ctx, next) => next() }, { priority: 100 });
      registry.register({ id: 'mw-b', execute: (_ctx, next) => next() }, { priority: 50 });
      registry.register({ id: 'mw-c', execute: (_ctx, next) => next() }, { priority: 50 });
      registry.register({ id: 'mw-d', execute: (_ctx, next) => next() }, { priority: 10 });
      registry.register({ id: 'mw-e', execute: (_ctx, next) => next() }, { priority: 150 });

      const resolver = new HttpMiddlewareResolver(registry);
      const resolved = resolver.resolve();

      assert.strictEqual(resolved.length, 5);
      // Expected order: E (150) -> A (100) -> B (50, seq 2) -> C (50, seq 3) -> D (10)
      assert.strictEqual(resolved[0].id, 'mw-e');
      assert.strictEqual(resolved[1].id, 'mw-a');
      assert.strictEqual(resolved[2].id, 'mw-b');
      assert.strictEqual(resolved[3].id, 'mw-c');
      assert.strictEqual(resolved[4].id, 'mw-d');

      const resolvedEntries = resolver.resolveEntries();
      assert.strictEqual(resolvedEntries[0].priority, 150);
      assert.strictEqual(resolvedEntries[2].sequence, 2);
      assert.strictEqual(resolvedEntries[3].sequence, 3);
    },
  );

  // =========================================================================
  // 7. RESOLVER DISABLED FILTERING
  // =========================================================================
  await t.test(
    '7. HttpMiddlewareResolver: Filter out disabled middleware during resolution',
    () => {
      const registry = new HttpMiddlewareRegistry();

      registry.register({ id: 'mw-1', execute: (_ctx, next) => next() }, { priority: 100 });
      registry.register(
        { id: 'mw-2', execute: (_ctx, next) => next() },
        { priority: 80, enabled: false },
      );
      registry.register({ id: 'mw-3', execute: (_ctx, next) => next() }, { priority: 60 });

      const resolver = new HttpMiddlewareResolver(registry);
      const resolved = resolver.resolve();

      assert.strictEqual(resolved.length, 2);
      assert.strictEqual(resolved[0].id, 'mw-1');
      assert.strictEqual(resolved[1].id, 'mw-3');
    },
  );

  // =========================================================================
  // 8. REGISTRY IMMUTABILITY & CONCURRENCY
  // =========================================================================
  await t.test(
    '8. HttpMiddlewareRegistry: Immutable list snapshots and concurrent registration safety',
    async () => {
      const registry = new HttpMiddlewareRegistry();

      const list1 = registry.list();
      assert.ok(Object.isFrozen(list1));
      assert.strictEqual(list1.length, 0);

      // Concurrent registration of 100 middleware
      const promises = Array.from({ length: 100 }, (_, i) => {
        return Promise.resolve().then(() => {
          registry.register(
            {
              id: `concurrent-mw-${i}`,
              execute: (_ctx, next) => next(),
            },
            { priority: i % 10 },
          );
        });
      });

      await Promise.all(promises);

      assert.strictEqual(registry.size, 100);
      const listEntries = registry.listEntries();
      assert.strictEqual(listEntries.length, 100);
      assert.ok(Object.isFrozen(listEntries));

      // Test resolver on concurrent registrations
      const resolver = new HttpMiddlewareResolver(registry);
      const resolved = resolver.resolveEntries();
      assert.strictEqual(resolved.length, 100);

      // Verify strict priority sorting: priority[i] >= priority[i+1]
      for (let i = 0; i < resolved.length - 1; i++) {
        assert.ok(
          resolved[i].priority >= resolved[i + 1].priority,
          `Resolution order invariant violated at index ${i}: ${resolved[i].priority} < ${resolved[i + 1].priority}`,
        );
        if (resolved[i].priority === resolved[i + 1].priority) {
          assert.ok(
            resolved[i].sequence < resolved[i + 1].sequence,
            `Sequence tie-break invariant violated at index ${i}: ${resolved[i].sequence} >= ${resolved[i + 1].sequence}`,
          );
        }
      }
    },
  );

  // =========================================================================
  // 9. ONION MODEL & REVERSE UNWINDING
  // =========================================================================
  await t.test(
    '9. HttpMiddlewareExecutor: Classic onion model execution (A -> B -> C -> target -> C -> B -> A)',
    async () => {
      const coordinator = new HttpMiddlewareCoordinator();
      const trail: string[] = [];

      coordinator.register(
        {
          id: 'mw-a',
          priority: 100,
          execute: async (_ctx, next) => {
            trail.push('A:enter');
            const res = await next();
            trail.push('A:exit');
            return res;
          },
        },
        { priority: 100 },
      );

      coordinator.register(
        {
          id: 'mw-b',
          priority: 50,
          execute: async (_ctx, next) => {
            trail.push('B:enter');
            const res = await next();
            trail.push('B:exit');
            return res;
          },
        },
        { priority: 50 },
      );

      coordinator.register(
        {
          id: 'mw-c',
          priority: 10,
          execute: async (_ctx, next) => {
            trail.push('C:enter');
            const res = await next();
            trail.push('C:exit');
            return res;
          },
        },
        { priority: 10 },
      );

      const context: HttpMiddlewareContext = {
        request: {
          method: 'GET',
          url: '/api/items',
          path: '/api/items',
          headers: {},
        },
        parameters: {},
        executionContext: {
          id: 'exec-1',
          traceId: 'tr-1',
          correlationId: 'cr-1',
          startTime: Date.now(),
          signal: new AbortController().signal,
          metadata: {},
          get: () => undefined,
          set: () => {},
          has: () => false,
        } as unknown as ExecutionContext,
        metadata: {},
      };

      const outcome = await coordinator.execute(context, async (_ctx) => {
        trail.push('target:execute');
        return { success: true, count: 42 };
      });

      assert.deepStrictEqual(trail, [
        'A:enter',
        'B:enter',
        'C:enter',
        'target:execute',
        'C:exit',
        'B:exit',
        'A:exit',
      ]);

      assert.deepStrictEqual(outcome.result, { success: true, count: 42 });
      assert.strictEqual(outcome.batch.totalMiddleware, 3);
      assert.strictEqual(outcome.batch.executedMiddleware, 3);
      assert.strictEqual(outcome.batch.failedMiddleware, 0);
      assert.strictEqual(outcome.batch.success, true);
    },
  );

  // =========================================================================
  // 10. FAILURE STRATEGY: FAIL_FAST
  // =========================================================================
  await t.test(
    '10. HttpMiddlewareExecutor: FAIL_FAST terminates immediately upon failure',
    async () => {
      const coordinator = new HttpMiddlewareCoordinator();
      const trail: string[] = [];

      coordinator.register(
        {
          id: 'mw-1',
          execute: async (_ctx, next) => {
            trail.push('mw-1:enter');
            const res = await next();
            trail.push('mw-1:exit');
            return res;
          },
        },
        { priority: 100, failureStrategy: 'FAIL_FAST' },
      );

      coordinator.register(
        {
          id: 'mw-2',
          execute: async () => {
            trail.push('mw-2:throw');
            throw new Error('Database connection failed');
          },
        },
        { priority: 50, failureStrategy: 'FAIL_FAST' },
      );

      coordinator.register(
        {
          id: 'mw-3',
          execute: async (_ctx, next) => {
            trail.push('mw-3:enter');
            return next();
          },
        },
        { priority: 10, failureStrategy: 'FAIL_FAST' },
      );

      const context: HttpMiddlewareContext = {
        request: { method: 'GET', url: '/test', path: '/test', headers: {} },
        parameters: {},
        executionContext: {
          id: 'exec-2',
          traceId: 'tr-2',
          correlationId: 'cr-2',
          startTime: Date.now(),
          signal: new AbortController().signal,
          metadata: {},
          get: () => undefined,
          set: () => {},
          has: () => false,
        } as unknown as ExecutionContext,
        metadata: {},
      };

      await assert.rejects(
        () => coordinator.execute(context, async () => ({ target: true })),
        (err: unknown) => {
          assert.ok(err instanceof HttpMiddlewareExecutionError);
          assert.strictEqual(err.middlewareId, 'mw-2');
          return true;
        },
      );

      assert.deepStrictEqual(trail, ['mw-1:enter', 'mw-2:throw']);
    },
  );

  // =========================================================================
  // 11. FAILURE STRATEGY: STOP
  // =========================================================================
  await t.test(
    '11. HttpMiddlewareExecutor: STOP skips un-entered downstream middleware',
    async () => {
      const coordinator = new HttpMiddlewareCoordinator();
      const trail: string[] = [];

      coordinator.register(
        {
          id: 'mw-1',
          execute: async (_ctx, next) => {
            trail.push('mw-1:enter');
            return next();
          },
        },
        { priority: 100, failureStrategy: 'STOP' },
      );

      coordinator.register(
        {
          id: 'mw-2',
          execute: async () => {
            trail.push('mw-2:error');
            throw new Error('Validation failed');
          },
        },
        { priority: 50, failureStrategy: 'STOP' },
      );

      coordinator.register(
        {
          id: 'mw-3',
          execute: async (_ctx, next) => {
            trail.push('mw-3:never-called');
            return next();
          },
        },
        { priority: 10, failureStrategy: 'STOP' },
      );

      const context: HttpMiddlewareContext = {
        request: { method: 'GET', url: '/stop-test', path: '/stop-test', headers: {} },
        parameters: {},
        executionContext: {
          id: 'exec-3',
          traceId: 'tr-3',
          correlationId: 'cr-3',
          startTime: Date.now(),
          signal: new AbortController().signal,
          metadata: {},
          get: () => undefined,
          set: () => {},
          has: () => false,
        } as unknown as ExecutionContext,
        metadata: {},
      };

      let caughtError: unknown;
      try {
        await coordinator.execute(context, async () => ({ ok: true }));
      } catch (err: unknown) {
        caughtError = err;
      }

      assert.ok(caughtError instanceof HttpMiddlewareExecutionError);
      assert.deepStrictEqual(trail, ['mw-1:enter', 'mw-2:error']);
    },
  );

  // =========================================================================
  // 12. FAILURE STRATEGY: CONTINUE
  // =========================================================================
  await t.test(
    '12. HttpMiddlewareExecutor: CONTINUE isolates pre-next failure and continues remaining pipeline',
    async () => {
      const coordinator = new HttpMiddlewareCoordinator();
      const trail: string[] = [];

      coordinator.register(
        {
          id: 'mw-1',
          execute: async (_ctx, next) => {
            trail.push('mw-1:enter');
            const res = await next();
            trail.push('mw-1:exit');
            return res;
          },
        },
        { priority: 100 },
      );

      // mw-2 throws BEFORE calling next(), but has CONTINUE strategy
      coordinator.register(
        {
          id: 'mw-2',
          execute: async () => {
            trail.push('mw-2:isolated-failure');
            throw new Error('Telemetry service offline');
          },
        },
        { priority: 50, failureStrategy: 'CONTINUE' },
      );

      coordinator.register(
        {
          id: 'mw-3',
          execute: async (_ctx, next) => {
            trail.push('mw-3:enter');
            const res = await next();
            trail.push('mw-3:exit');
            return res;
          },
        },
        { priority: 10 },
      );

      const context: HttpMiddlewareContext = {
        request: { method: 'GET', url: '/continue-test', path: '/continue-test', headers: {} },
        parameters: {},
        executionContext: {
          id: 'exec-4',
          traceId: 'tr-4',
          correlationId: 'cr-4',
          startTime: Date.now(),
          signal: new AbortController().signal,
          metadata: {},
          get: () => undefined,
          set: () => {},
          has: () => false,
        } as unknown as ExecutionContext,
        metadata: {},
      };

      const outcome = await coordinator.execute(context, async () => {
        trail.push('target:invoked');
        return 'success-value';
      });

      assert.deepStrictEqual(trail, [
        'mw-1:enter',
        'mw-2:isolated-failure',
        'mw-3:enter',
        'target:invoked',
        'mw-3:exit',
        'mw-1:exit',
      ]);

      assert.strictEqual(outcome.result, 'success-value');
      assert.strictEqual(outcome.batch.totalMiddleware, 3);
      assert.strictEqual(outcome.batch.executedMiddleware, 3);
      assert.strictEqual(outcome.batch.failedMiddleware, 1);
      assert.strictEqual(outcome.batch.results[1].state, 'FAILED');
    },
  );

  // =========================================================================
  // 13. CANCELLATION HANDLING
  // =========================================================================
  await t.test(
    '13. HttpMiddlewareExecutor: AbortSignal cancellation stops execution and marks CANCELLED',
    async () => {
      const coordinator = new HttpMiddlewareCoordinator();
      const abortController = new AbortController();

      coordinator.register(
        {
          id: 'mw-cancel',
          execute: async (_ctx, next) => {
            abortController.abort(); // Abort during execution
            return next();
          },
        },
        { priority: 100 },
      );

      coordinator.register(
        {
          id: 'mw-downstream',
          execute: async (_ctx, next) => next(),
        },
        { priority: 50 },
      );

      const context: HttpMiddlewareContext = {
        request: { method: 'GET', url: '/abort', path: '/abort', headers: {} },
        parameters: {},
        executionContext: {
          id: 'exec-5',
          traceId: 'tr-5',
          correlationId: 'cr-5',
          startTime: Date.now(),
          signal: abortController.signal,
          metadata: {},
          get: () => undefined,
          set: () => {},
          has: () => false,
        } as unknown as ExecutionContext,
        metadata: {},
      };

      await assert.rejects(
        () => coordinator.execute(context, async () => ({ cancelled: false })),
        (err: unknown) => {
          assert.ok(err instanceof HttpMiddlewareCancellationError);
          return true;
        },
      );
    },
  );

  // =========================================================================
  // 14. TIMEOUT HANDLING
  // =========================================================================
  await t.test(
    '14. HttpMiddlewareExecutor: Configurable timeout rejects with HttpMiddlewareTimeoutError and cleans up',
    async () => {
      const coordinator = new HttpMiddlewareCoordinator();

      coordinator.register(
        {
          id: 'mw-slow',
          execute: async () => {
            await new Promise((resolve) => setTimeout(resolve, 200));
            return { slow: true };
          },
        },
        { priority: 100, timeoutMs: 30 }, // 30ms timeout
      );

      const context: HttpMiddlewareContext = {
        request: { method: 'GET', url: '/timeout', path: '/timeout', headers: {} },
        parameters: {},
        executionContext: {
          id: 'exec-6',
          traceId: 'tr-6',
          correlationId: 'cr-6',
          startTime: Date.now(),
          signal: new AbortController().signal,
          metadata: {},
          get: () => undefined,
          set: () => {},
          has: () => false,
        } as unknown as ExecutionContext,
        metadata: {},
      };

      await assert.rejects(
        () => coordinator.execute(context, async () => ({ ok: true })),
        (err: unknown) => {
          assert.ok(err instanceof HttpMiddlewareTimeoutError);
          assert.strictEqual((err as HttpMiddlewareTimeoutError).middlewareId, 'mw-slow');
          assert.strictEqual((err as HttpMiddlewareTimeoutError).timeoutMs, 30);
          return true;
        },
      );

      // Verify active executions returned to 0
      const diagnostics = coordinator.getDiagnostics();
      assert.strictEqual(diagnostics.activeExecutions, 0);
      assert.strictEqual(diagnostics.failedExecutions, 1);
    },
  );

  // =========================================================================
  // 15. EXACTLY-ONCE INVOCATION
  // =========================================================================
  await t.test(
    '15. HttpMiddlewareExecutor: Multiple next() calls trigger HttpMiddlewareExecutionError',
    async () => {
      const coordinator = new HttpMiddlewareCoordinator();

      coordinator.register(
        {
          id: 'mw-double-next',
          execute: async (_ctx, next) => {
            await next();
            return next(); // Second call must throw
          },
        },
        { priority: 100 },
      );

      const context: HttpMiddlewareContext = {
        request: { method: 'GET', url: '/double-next', path: '/double-next', headers: {} },
        parameters: {},
        executionContext: {
          id: 'exec-7',
          traceId: 'tr-7',
          correlationId: 'cr-7',
          startTime: Date.now(),
          signal: new AbortController().signal,
          metadata: {},
          get: () => undefined,
          set: () => {},
          has: () => false,
        } as unknown as ExecutionContext,
        metadata: {},
      };

      await assert.rejects(
        () => coordinator.execute(context, async () => 'target-res'),
        (err: unknown) => {
          assert.ok(err instanceof HttpMiddlewareExecutionError);
          assert.ok((err as Error).message.includes('next() was called multiple times'));
          return true;
        },
      );
    },
  );

  // =========================================================================
  // 16. DIAGNOSTICS & PROFILING
  // =========================================================================
  await t.test(
    '16. HttpMiddlewareDiagnostics & Profiler: Pure numerical tracking and snapshot reset',
    async () => {
      const diagnostics = new HttpMiddlewareDiagnostics();
      const profiler = new HttpMiddlewareProfiler().start();

      diagnostics.recordExecutionStarted();
      const elapsed = profiler.stop();
      assert.ok(elapsed >= 0);

      diagnostics.recordExecutionSuccess(elapsed);
      diagnostics.recordRegistrationFailure();
      diagnostics.recordExecutionSkipped();

      const snapshot = diagnostics.getSnapshot();
      assert.ok(Object.isFrozen(snapshot));
      assert.strictEqual(snapshot.totalExecutions, 1);
      assert.strictEqual(snapshot.successfulExecutions, 1);
      assert.strictEqual(snapshot.failedExecutions, 0);
      assert.strictEqual(snapshot.registrationFailures, 1);
      assert.strictEqual(snapshot.skippedExecutions, 1);
      assert.strictEqual(snapshot.activeExecutions, 0);

      diagnostics.reset();
      const resetSnapshot = diagnostics.getSnapshot();
      assert.strictEqual(resetSnapshot.totalExecutions, 0);
      assert.strictEqual(resetSnapshot.successfulExecutions, 0);
      assert.strictEqual(resetSnapshot.registrationFailures, 0);
    },
  );

  // =========================================================================
  // 17. DIRECT EXECUTOR INVOCATION & SHORT-CIRCUIT
  // =========================================================================
  await t.test(
    '17. HttpMiddlewareExecutor: Direct invocation and short-circuit without invoking target',
    async () => {
      const diagnostics = new HttpMiddlewareDiagnostics();
      const executor = new HttpMiddlewareExecutor(diagnostics);
      let targetInvoked = false;

      const entries = [
        {
          middleware: {
            id: 'short-circuit-mw',
            execute: async () => {
              // Does NOT call next(), returns early response
              return { shortCircuited: true };
            },
          },
          priority: 100,
          enabled: true,
          failureStrategy: 'FAIL_FAST' as const,
          sequence: 1,
        },
      ];

      const context: HttpMiddlewareContext = {
        request: { method: 'GET', url: '/short', path: '/short', headers: {} },
        parameters: {},
        executionContext: {
          id: 'exec-8',
          traceId: 'tr-8',
          correlationId: 'cr-8',
          startTime: Date.now(),
          signal: new AbortController().signal,
          metadata: {},
          get: () => undefined,
          set: () => {},
          has: () => false,
        } as unknown as ExecutionContext,
        metadata: {},
      };

      const outcome = await executor.execute(context, entries, async () => {
        targetInvoked = true;
        return { target: true };
      });

      assert.strictEqual(targetInvoked, false);
      assert.deepStrictEqual(outcome.result, { shortCircuited: true });
      assert.strictEqual(outcome.batch.totalMiddleware, 1);
      assert.strictEqual(outcome.batch.executedMiddleware, 1);
      assert.strictEqual(outcome.batch.success, true);
    },
  );

  // =========================================================================
  // 18. END-TO-END ROUTING + MIDDLEWARE + EXECUTION PIPELINE
  // =========================================================================
  await t.test(
    '18. End-to-End: Request -> Route -> Middleware -> Execution -> Application -> Unwinding -> Response',
    async () => {
      let appServiceExecuted = false;
      const app = ApplicationIntegrationBuilder.create().build();
      app.applicationManager.register('users.getById', {
        async execute(input: unknown) {
          appServiceExecuted = true;
          const typedInput = input as { parameters: { id: string } };
          return { userId: typedInput.parameters.id, username: 'alice' };
        },
      });
      await app.start();

      const router = new HttpRouter();
      router.get('/api/v1/users/:id', 'users.getById');

      const auditTrail: string[] = [];

      router.use(
        {
          id: 'timing-mw',
          execute: async (_ctx: HttpMiddlewareContext, next: HttpMiddlewareNext) => {
            auditTrail.push('timing:enter');
            const res = (await next()) as HttpResponse<{ userId: string; username: string }>;
            auditTrail.push('timing:exit');
            return {
              ...res,
              headers: {
                ...res.headers,
                'x-execution-time': '12ms',
              },
            };
          },
        },
        { priority: 100 },
      );

      router.use(
        {
          id: 'auth-header-mw',
          execute: async (ctx: HttpMiddlewareContext, next: HttpMiddlewareNext) => {
            auditTrail.push('auth:check');
            assert.strictEqual(ctx.route?.id, 'GET:/api/v1/users/:id');
            assert.strictEqual(ctx.parameters.id, '42');
            return next();
          },
        },
        { priority: 50 },
      );

      const manager = HttpTransportBuilder.create()
        .withApplication(app)
        .withRouter(router)
        .withAutoStart(true)
        .build();

      const response = await manager.handleRoutedRequest({
        method: 'GET',
        url: '/api/v1/users/42',
        path: '/api/v1/users/42',
        headers: { authorization: 'Bearer valid-token' },
      });

      assert.strictEqual(appServiceExecuted, true);
      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.headers['x-execution-time'], '12ms');
      assert.deepStrictEqual(response.body, { userId: '42', username: 'alice' });

      assert.deepStrictEqual(auditTrail, ['timing:enter', 'auth:check', 'timing:exit']);

      await manager.stop();
    },
  );

  // =========================================================================
  // 19. MIDDLEWARE SHORT-CIRCUIT
  // =========================================================================
  await t.test(
    '19. Middleware short-circuit: Early response returned without invoking application layer',
    async () => {
      let appInvoked = false;
      const app = ApplicationIntegrationBuilder.create().build();
      app.applicationManager.register('secret.data', {
        async execute() {
          appInvoked = true;
          return { confidential: 'data' };
        },
      });
      await app.start();

      const router = new HttpRouter();
      router.get('/api/secret', 'secret.data');

      // Security middleware that short-circuits on missing auth header
      router.use({
        id: 'auth-guard',
        execute: async (ctx: HttpMiddlewareContext, next: HttpMiddlewareNext) => {
          if (!ctx.request.headers['authorization']) {
            return {
              status: 401,
              headers: { 'www-authenticate': 'Bearer' },
              body: { error: 'Unauthorized: missing authorization header' },
            };
          }
          return next();
        },
      });

      const manager = HttpTransportBuilder.create()
        .withApplication(app)
        .withRouter(router)
        .withAutoStart(true)
        .build();

      const unauthResponse = await manager.handleRoutedRequest({
        method: 'GET',
        url: '/api/secret',
        path: '/api/secret',
        headers: {}, // No auth header
      });

      assert.strictEqual(appInvoked, false); // Application was NOT invoked
      assert.strictEqual(unauthResponse.status, 401);
      assert.strictEqual(unauthResponse.headers['www-authenticate'], 'Bearer');
      assert.deepStrictEqual(unauthResponse.body, {
        error: 'Unauthorized: missing authorization header',
      });

      await manager.stop();
    },
  );

  // =========================================================================
  // 20. EXECUTION CONTEXT PRESERVATION
  // =========================================================================
  await t.test(
    '20. ExecutionContext identity is preserved across Router -> Middleware -> Application',
    async () => {
      let observedExecutionId = '';
      const app = ApplicationIntegrationBuilder.create().build();
      app.applicationManager.register('test.context', {
        async execute(_input: unknown, ctx?: ExecutionContext) {
          observedExecutionId = ctx?.executionId ?? '';
          return { ok: true };
        },
      });
      await app.start();

      const router = new HttpRouter();
      router.get('/api/context-test', 'test.context');

      let mwObservedExecutionId = '';
      router.use({
        id: 'context-verifier',
        execute: async (ctx: HttpMiddlewareContext, next: HttpMiddlewareNext) => {
          mwObservedExecutionId = ctx.executionContext.executionId;
          return next();
        },
      });

      const manager = HttpTransportBuilder.create()
        .withApplication(app)
        .withRouter(router)
        .withAutoStart(true)
        .build();

      const customContext = {
        executionId: 'req-abc-123',
        state: 'ACTIVE',
        metadata: { correlationId: 'corr-12345' },
        createdAt: Date.now(),
        signal: new AbortController().signal,
        start: () => {},
        complete: () => {},
        fail: () => {},
        cancel: () => {},
        child: () => customContext,
      } as unknown as ExecutionContext;

      await manager.handleRoutedRequest(
        {
          method: 'GET',
          url: '/api/context-test',
          path: '/api/context-test',
          headers: {},
        },
        { context: customContext },
      );

      assert.strictEqual(mwObservedExecutionId, 'req-abc-123');
      assert.strictEqual(observedExecutionId, 'req-abc-123');

      await manager.stop();
    },
  );

  // =========================================================================
  // 21. ERROR BOUNDARY INTEGRATION
  // =========================================================================
  await t.test(
    '21. Middleware error propagates into HTTP error boundary without unhandled crash',
    async () => {
      const app = ApplicationIntegrationBuilder.create().build();
      app.applicationManager.register('failing.service', {
        async execute() {
          return { ok: true };
        },
      });
      await app.start();

      const router = new HttpRouter();
      router.get('/api/crash', 'failing.service');

      router.use({
        id: 'broken-mw',
        execute: async () => {
          throw new Error('Unexpected middleware crash');
        },
      });

      const manager = HttpTransportBuilder.create()
        .withApplication(app)
        .withRouter(router)
        .withAutoStart(true)
        .build();

      const response = await manager.handleRoutedRequest({
        method: 'GET',
        url: '/api/crash',
        path: '/api/crash',
        headers: {},
      });

      assert.strictEqual(response.status, 500);
      assert.ok(response.body);

      await manager.stop();
    },
  );

  // =========================================================================
  // 22. DIRECT PIPELINE & ROUTING COORDINATOR INTEGRATION
  // =========================================================================
  await t.test(
    '22. HttpRoutingCoordinator & HttpMiddlewarePipeline: Direct coordinator integration',
    async () => {
      const app = ApplicationIntegrationBuilder.create().build();
      app.applicationManager.register('items.list', {
        async execute() {
          return [{ id: 'item-1', name: 'Hammer' }];
        },
      });
      await app.start();

      const router = new HttpRouter();
      router.get('/items', 'items.list');

      const pipeline = new HttpMiddlewarePipeline(router.middlewareCoordinator);
      assert.ok(pipeline instanceof HttpMiddlewarePipeline);

      const manager = HttpTransportBuilder.create()
        .withApplication(app)
        .withRouter(router)
        .withMiddleware({
          id: 'fluent-mw',
          execute: async (_ctx: HttpMiddlewareContext, next: HttpMiddlewareNext) => {
            const res = (await next()) as HttpResponse;
            return {
              ...res,
              headers: { ...res.headers, 'x-fluent': 'applied' },
            };
          },
        })
        .withAutoStart(true)
        .build();

      assert.ok(manager instanceof HttpTransportManager);
      assert.ok(manager.routingCoordinator instanceof HttpRoutingCoordinator);

      const res = await manager.handleRoutedRequest({
        method: 'GET',
        url: '/items',
        path: '/items',
        headers: {},
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers['x-fluent'], 'applied');

      const diag = manager.getMiddlewareDiagnostics();
      assert.ok(diag);
      assert.strictEqual(diag.successfulExecutions, 1);

      await manager.stop();
    },
  );
});
