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
  HttpMiddlewareSnapshot,
  HttpMiddlewareStateError,
  HttpMiddlewareTimeoutError,
  HttpMiddlewareValidationError,
  HttpMiddlewareValidator,
} from '../src/index';

test('CoreForge HTTP Middleware Engine (@coreforge/http) — Stage 1: Middleware Contracts & Foundation', async (t) => {
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
});
