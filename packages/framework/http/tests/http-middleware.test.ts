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
} from '@coreforge/contracts';
import { CoreForgeError } from '@coreforge/errors';

import {
  HttpError,
  HttpMiddlewareCancellationError,
  HttpMiddlewareConfigurationError,
  HttpMiddlewareDuplicateError,
  HttpMiddlewareError,
  HttpMiddlewareExecutionError,
  HttpMiddlewarePipelineError,
  HttpMiddlewareRegistrationError,
  HttpMiddlewareRegistry,
  HttpMiddlewareResolver,
  HttpMiddlewareSnapshot,
  HttpMiddlewareStateError,
  HttpMiddlewareTimeoutError,
  HttpMiddlewareValidationError,
  HttpMiddlewareValidator,
} from '../src/index';

test('CoreForge HTTP Middleware Engine (@coreforge/http) — Stage 1 & 2: Middleware Contracts, Registry & Resolver', async (t) => {
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
});
