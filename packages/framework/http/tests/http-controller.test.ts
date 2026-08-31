import * as assert from 'node:assert';
import { test } from 'node:test';

import type {
  HttpController,
  HttpControllerContext,
  HttpControllerResult,
  HttpEndpoint,
  ExecutionContext,
  HttpRequest,
} from '@coreforge/contracts';

import {
  HttpControllerCancellationError,
  HttpControllerConfigurationError,
  HttpControllerCoordinator,
  HttpControllerDiagnostics,
  HttpControllerDuplicateError,
  HttpControllerError,
  HttpControllerExecutionError,
  HttpControllerExecutor,
  HttpControllerProfiler,
  HttpControllerRegistrationError,
  HttpControllerRegistry,
  HttpControllerResolver,
  HttpControllerSnapshot,
  HttpControllerStateError,
  HttpControllerTimeoutError,
  HttpControllerValidationError,
  HttpControllerValidator,
  HttpEndpointDuplicateError,
  HttpEndpointError,
  HttpEndpointNotFoundError,
  HttpEndpointRegistrationError,
  HttpEndpointRegistry,
  HttpEndpointResolver,
  HttpEndpointValidationError,
  HttpError,
} from '../src/index';

test('CoreForge HTTP Controller & Endpoint Infrastructure (@coreforge/http)', async (t) => {
  // ─── 1. Error Hierarchy ────────────────────────────────────────────────────

  await t.test('1. Error Hierarchy: all controller errors inherit correctly', () => {
    const base = new HttpControllerError('base', 'CF-HTTP-CONTROLLER');
    assert.ok(base instanceof HttpError);
    assert.ok(base instanceof HttpControllerError);
    assert.strictEqual(base.name, 'HttpControllerError');

    const cfgErr = new HttpControllerConfigurationError('cfg');
    assert.ok(cfgErr instanceof HttpControllerError);
    assert.strictEqual(cfgErr.name, 'HttpControllerConfigurationError');

    const regErr = new HttpControllerRegistrationError('reg');
    assert.ok(regErr instanceof HttpControllerError);
    assert.strictEqual(regErr.name, 'HttpControllerRegistrationError');

    const dupErr = new HttpControllerDuplicateError('ctrl.id');
    assert.ok(dupErr instanceof HttpControllerError);
    assert.strictEqual(dupErr.controllerId, 'ctrl.id');
    assert.ok(dupErr.message.includes('ctrl.id'));

    const valErr = new HttpControllerValidationError('val');
    assert.ok(valErr instanceof HttpControllerError);
    assert.strictEqual(valErr.name, 'HttpControllerValidationError');

    const stateErr = new HttpControllerStateError('state');
    assert.ok(stateErr instanceof HttpControllerError);
    assert.strictEqual(stateErr.name, 'HttpControllerStateError');

    const execErr = new HttpControllerExecutionError('exec', 'ctrl.id');
    assert.ok(execErr instanceof HttpControllerError);
    assert.strictEqual(execErr.controllerId, 'ctrl.id');

    const cancelErr = new HttpControllerCancellationError('cancel', 'ctrl.id');
    assert.ok(cancelErr instanceof HttpControllerError);
    assert.strictEqual(cancelErr.controllerId, 'ctrl.id');

    const timeoutErr = new HttpControllerTimeoutError('timeout', 'ctrl.id', 5000);
    assert.ok(timeoutErr instanceof HttpControllerError);
    assert.strictEqual(timeoutErr.controllerId, 'ctrl.id');
    assert.strictEqual(timeoutErr.timeoutMs, 5000);

    const epErr = new HttpEndpointError('ep', 'CF-HTTP-ENDPOINT', 'ep.id');
    assert.ok(epErr instanceof HttpControllerError);
    assert.strictEqual(epErr.name, 'HttpEndpointError');
    assert.strictEqual(epErr.endpointId, 'ep.id');

    const epDupErr = new HttpEndpointDuplicateError('ep.id');
    assert.ok(epDupErr instanceof HttpEndpointError);
    assert.ok(epDupErr.message.includes('ep.id'));

    const epValErr = new HttpEndpointValidationError('val', 'ep.id');
    assert.ok(epValErr instanceof HttpEndpointError);

    const epNotFoundErr = new HttpEndpointNotFoundError('route.id');
    assert.ok(epNotFoundErr instanceof HttpEndpointError);

    const epRegErr = new HttpEndpointRegistrationError('reg', 'ep.id');
    assert.ok(epRegErr instanceof HttpEndpointError);
  });

  // ─── 2. Controller Validation ──────────────────────────────────────────────

  await t.test('2. Controller Validation: accepts valid controllers', () => {
    const controller: HttpController = {
      id: 'user.controller',
      name: 'UserController',
      priority: 10,
      execute: async () => ({ userId: '42' }),
    };
    const validated = HttpControllerValidator.validate(controller);
    assert.strictEqual(validated.id, 'user.controller');
    assert.strictEqual(validated.name, 'UserController');
    assert.strictEqual(validated.priority, 10);
  });

  await t.test('2b. Controller Validation: rejects invalid controller definitions', () => {
    assert.throws(() => HttpControllerValidator.validate(null), HttpControllerValidationError);
    assert.throws(
      () => HttpControllerValidator.validate({ id: '', name: 'X', execute: () => {} }),
      HttpControllerValidationError,
    );
    assert.throws(
      () => HttpControllerValidator.validate({ id: 'x', name: '', execute: () => {} }),
      HttpControllerValidationError,
    );
    assert.throws(
      () => HttpControllerValidator.validate({ id: 'x', name: 'Y', execute: 'not-a-fn' }),
      HttpControllerValidationError,
    );
    assert.throws(
      () =>
        HttpControllerValidator.validate({
          id: 'x',
          name: 'Y',
          execute: () => {},
          priority: 'high',
        }),
      HttpControllerValidationError,
    );
  });

  // ─── 3. Endpoint Validation ────────────────────────────────────────────────

  await t.test('3. Endpoint Validation: accepts valid endpoints', () => {
    const endpoint: HttpEndpoint = {
      id: 'user.get.endpoint',
      name: 'GetUserEndpoint',
      routeId: 'users.get',
      operation: 'users.get',
      controllerId: 'user.controller',
      metadata: Object.freeze({}),
      enabled: true,
      priority: 0,
    };
    const validated = HttpControllerValidator.validateEndpoint(endpoint);
    assert.strictEqual(validated.id, 'user.get.endpoint');
    assert.strictEqual(validated.routeId, 'users.get');
    assert.strictEqual(validated.controllerId, 'user.controller');
  });

  await t.test('3b. Endpoint Validation: rejects invalid endpoint definitions', () => {
    assert.throws(
      () => HttpControllerValidator.validateEndpoint(null),
      HttpEndpointValidationError,
    );
    assert.throws(
      () =>
        HttpControllerValidator.validateEndpoint({
          id: '',
          name: 'X',
          routeId: 'r',
          operation: 'op',
          controllerId: 'c',
          metadata: {},
          enabled: true,
          priority: 0,
        }),
      HttpEndpointValidationError,
    );
    assert.throws(
      () =>
        HttpControllerValidator.validateEndpoint({
          id: 'ep',
          name: '',
          routeId: 'r',
          operation: 'op',
          controllerId: 'c',
          metadata: {},
          enabled: true,
          priority: 0,
        }),
      HttpEndpointValidationError,
    );
    assert.throws(
      () =>
        HttpControllerValidator.validateEndpoint({
          id: 'ep',
          name: 'N',
          routeId: '',
          operation: 'op',
          controllerId: 'c',
          metadata: {},
          enabled: true,
          priority: 0,
        }),
      HttpEndpointValidationError,
    );
    assert.throws(
      () =>
        HttpControllerValidator.validateEndpoint({
          id: 'ep',
          name: 'N',
          routeId: 'r',
          operation: '',
          controllerId: 'c',
          metadata: {},
          enabled: true,
          priority: 0,
        }),
      HttpEndpointValidationError,
    );
    assert.throws(
      () =>
        HttpControllerValidator.validateEndpoint({
          id: 'ep',
          name: 'N',
          routeId: 'r',
          operation: 'op',
          controllerId: '',
          metadata: {},
          enabled: true,
          priority: 0,
        }),
      HttpEndpointValidationError,
    );
  });

  // ─── 4. Immutable Context Snapshot ─────────────────────────────────────────

  await t.test('4. Immutable Context Snapshot: creates deep-frozen controller context', () => {
    const mockSignal = new AbortController().signal;
    const mockExecCtx = { signal: mockSignal, id: 'exec-1' } as unknown as ExecutionContext;

    const ctx: HttpControllerContext = {
      request: {
        method: 'GET',
        url: '/users/1',
        path: '/users/1',
        headers: {},
        query: {},
      } as unknown as HttpRequest,
      route: { id: 'users.get', method: 'GET', path: '/users/:id', operation: 'users.get' },
      parameters: { id: '1' },
      metadata: { version: 'v1' },
      executionContext: mockExecCtx,
    };

    const snapshot = HttpControllerSnapshot.createContext(ctx);

    assert.ok(Object.isFrozen(snapshot));
    assert.ok(Object.isFrozen(snapshot.route));
    assert.ok(Object.isFrozen(snapshot.parameters));
    assert.ok(Object.isFrozen(snapshot.metadata));

    assert.throws(() => {
      (snapshot.parameters as unknown as Record<string, string>).id = 'mutated';
    });
    assert.throws(() => {
      (snapshot.metadata as unknown as Record<string, unknown>).version = 'v2';
    });
  });

  await t.test('4b. Immutable Result Snapshot: creates frozen controller result', () => {
    const result: HttpControllerResult = HttpControllerSnapshot.createResult(
      true,
      'COMPLETED',
      12.5,
      { userId: '42' },
      { source: 'test' },
    );

    assert.ok(Object.isFrozen(result));
    assert.ok(Object.isFrozen(result.metadata));
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.state, 'COMPLETED');
    assert.strictEqual(result.durationMs, 12.5);
    assert.deepStrictEqual(result.value, { userId: '42' });
    assert.strictEqual(result.metadata['source'], 'test');

    assert.throws(() => {
      (result as unknown as Record<string, unknown>).success = false;
    });
  });

  await t.test('4c. Immutable Endpoint Snapshot: creates frozen endpoint', () => {
    const endpoint: HttpEndpoint = {
      id: 'ep.1',
      name: 'Ep1',
      routeId: 'r.1',
      operation: 'op.1',
      controllerId: 'ctrl.1',
      metadata: {},
      enabled: true,
      priority: 5,
    };

    const snapshot = HttpControllerSnapshot.createEndpoint(endpoint);
    assert.ok(Object.isFrozen(snapshot));
    assert.ok(Object.isFrozen(snapshot.metadata));
    assert.throws(() => {
      (snapshot as unknown as Record<string, unknown>).priority = 99;
    });
  });

  await t.test('4d. Immutable Controller Snapshot: creates frozen controller reference', () => {
    const ctrl: HttpController = {
      id: 'c.1',
      name: 'C1',
      execute: async () => ({}),
    };
    const snapshot = HttpControllerSnapshot.createController(ctrl);
    assert.ok(Object.isFrozen(snapshot));
    assert.strictEqual(snapshot.id, 'c.1');
  });

  // ─── 5. Controller Registry ─────────────────────────────────────────────────

  await t.test('5. Controller Registry: registers and retrieves controllers', () => {
    const registry = new HttpControllerRegistry();
    assert.strictEqual(registry.size, 0);
    assert.strictEqual(registry.locked, false);

    const ctrl: HttpController = { id: 'ctrl.a', name: 'CtrlA', execute: async () => ({}) };
    registry.register(ctrl, 10);

    assert.strictEqual(registry.size, 1);
    assert.ok(registry.has('ctrl.a'));
    assert.strictEqual(registry.get('ctrl.a')?.id, 'ctrl.a');
  });

  await t.test('5b. Controller Registry: rejects duplicate IDs', () => {
    const registry = new HttpControllerRegistry();
    const ctrl: HttpController = { id: 'ctrl.dup', name: 'Dup', execute: async () => ({}) };
    registry.register(ctrl);

    assert.throws(() => registry.register(ctrl), HttpControllerDuplicateError);
  });

  await t.test('5c. Controller Registry: rejects registration after lock', () => {
    const registry = new HttpControllerRegistry();
    registry.lock();
    assert.strictEqual(registry.locked, true);

    const ctrl: HttpController = { id: 'ctrl.x', name: 'X', execute: async () => ({}) };
    assert.throws(() => registry.register(ctrl), HttpControllerRegistrationError);
  });

  await t.test('5d. Controller Registry: rejects clear when locked', () => {
    const registry = new HttpControllerRegistry();
    registry.register({ id: 'c', name: 'C', execute: async () => ({}) });
    registry.lock();
    assert.throws(
      () => (registry as unknown as { clear(): void }).clear(),
      HttpControllerStateError,
    );
  });

  // ─── 6. Controller Resolver ─────────────────────────────────────────────────

  await t.test('6. Controller Resolver: deterministic priority DESC then sequence ASC', () => {
    const registry = new HttpControllerRegistry();
    const c1: HttpController = { id: 'c1', name: 'C1', execute: async () => ({}) };
    const c2: HttpController = { id: 'c2', name: 'C2', execute: async () => ({}) };
    const c3: HttpController = { id: 'c3', name: 'C3', execute: async () => ({}) };

    registry.register(c1, 5); // seq=1, priority=5
    registry.register(c2, 10); // seq=2, priority=10  ← highest
    registry.register(c3, 5); // seq=3, priority=5

    const resolver = new HttpControllerResolver(registry);
    const resolved = resolver.resolve();

    assert.strictEqual(resolved[0].id, 'c2'); // priority 10 first
    assert.strictEqual(resolved[1].id, 'c1'); // priority 5, seq 1 before seq 3
    assert.strictEqual(resolved[2].id, 'c3');
  });

  await t.test('6b. Controller Resolver: resolves by ID', () => {
    const registry = new HttpControllerRegistry();
    registry.register({ id: 'ctrl.lookup', name: 'L', execute: async () => ({}) });
    const resolver = new HttpControllerResolver(registry);

    assert.strictEqual(resolver.resolveById('ctrl.lookup')?.id, 'ctrl.lookup');
    assert.strictEqual(resolver.resolveById('ctrl.missing'), undefined);
  });

  // ─── 7. Endpoint Registry ───────────────────────────────────────────────────

  await t.test('7. Endpoint Registry: registers and retrieves endpoints', () => {
    const registry = new HttpEndpointRegistry();
    assert.strictEqual(registry.size, 0);

    const ep: HttpEndpoint = {
      id: 'ep.users.get',
      name: 'GetUser',
      routeId: 'users.get',
      operation: 'users.get',
      controllerId: 'user.ctrl',
      metadata: {},
      enabled: true,
      priority: 0,
    };
    registry.register(ep);

    assert.strictEqual(registry.size, 1);
    assert.ok(registry.has('ep.users.get'));
    assert.strictEqual(registry.get('ep.users.get')?.id, 'ep.users.get');
    assert.strictEqual(registry.getByRouteId('users.get')?.id, 'ep.users.get');
  });

  await t.test('7b. Endpoint Registry: rejects duplicate endpoint IDs', () => {
    const registry = new HttpEndpointRegistry();
    const ep: HttpEndpoint = {
      id: 'ep.dup',
      name: 'Dup',
      routeId: 'route.dup',
      operation: 'op',
      controllerId: 'c',
      metadata: {},
      enabled: true,
      priority: 0,
    };
    registry.register(ep);
    assert.throws(() => registry.register(ep), HttpEndpointDuplicateError);
  });

  await t.test('7c. Endpoint Registry: rejects duplicate route/controller bindings', () => {
    const registry = new HttpEndpointRegistry();
    const ep1: HttpEndpoint = {
      id: 'ep.r1.a',
      name: 'A',
      routeId: 'route.shared',
      operation: 'op',
      controllerId: 'c',
      metadata: {},
      enabled: true,
      priority: 0,
    };
    const ep2: HttpEndpoint = {
      id: 'ep.r1.b',
      name: 'B',
      routeId: 'route.shared', // same routeId
      operation: 'op',
      controllerId: 'c',
      metadata: {},
      enabled: true,
      priority: 0,
    };
    registry.register(ep1);
    assert.throws(() => registry.register(ep2), HttpEndpointRegistrationError);
  });

  await t.test('7d. Endpoint Registry: rejects registration after lock', () => {
    const registry = new HttpEndpointRegistry();
    registry.lock();
    const ep: HttpEndpoint = {
      id: 'ep.locked',
      name: 'L',
      routeId: 'r',
      operation: 'op',
      controllerId: 'c',
      metadata: {},
      enabled: true,
      priority: 0,
    };
    assert.throws(() => registry.register(ep), HttpEndpointRegistrationError);
  });

  // ─── 8. Endpoint Resolver ───────────────────────────────────────────────────

  await t.test('8. Endpoint Resolver: deterministic priority DESC then sequence ASC', () => {
    const registry = new HttpEndpointRegistry();

    const makeEp = (id: string, routeId: string, priority: number): HttpEndpoint => ({
      id,
      name: id,
      routeId,
      operation: routeId,
      controllerId: 'c',
      metadata: {},
      enabled: true,
      priority,
    });

    registry.register(makeEp('ep.a', 'route.a', 5));
    registry.register(makeEp('ep.b', 'route.b', 10));
    registry.register(makeEp('ep.c', 'route.c', 5));

    const resolver = new HttpEndpointResolver(registry);
    const resolved = resolver.resolve();

    assert.strictEqual(resolved[0].id, 'ep.b'); // priority 10
    assert.strictEqual(resolved[1].id, 'ep.a'); // priority 5, registered first
    assert.strictEqual(resolved[2].id, 'ep.c');
  });

  await t.test('8b. Endpoint Resolver: filters disabled endpoints', () => {
    const registry = new HttpEndpointRegistry();

    registry.register({
      id: 'ep.enabled',
      name: 'E',
      routeId: 'route.en',
      operation: 'op',
      controllerId: 'c',
      metadata: {},
      enabled: true,
      priority: 0,
    });
    registry.register({
      id: 'ep.disabled',
      name: 'D',
      routeId: 'route.dis',
      operation: 'op',
      controllerId: 'c',
      metadata: {},
      enabled: false,
      priority: 0,
    });

    const resolver = new HttpEndpointResolver(registry);
    const resolved = resolver.resolve();

    assert.strictEqual(resolved.length, 1);
    assert.strictEqual(resolved[0].id, 'ep.enabled');
  });

  await t.test('8c. Endpoint Resolver: resolves by routeId', () => {
    const registry = new HttpEndpointRegistry();
    registry.register({
      id: 'ep.r',
      name: 'R',
      routeId: 'route.lookup',
      operation: 'op',
      controllerId: 'c',
      metadata: {},
      enabled: true,
      priority: 0,
    });
    const resolver = new HttpEndpointResolver(registry);

    assert.strictEqual(resolver.resolveByRouteId('route.lookup')?.id, 'ep.r');
    assert.strictEqual(resolver.resolveByRouteId('route.missing'), undefined);
  });

  await t.test(
    '9. Concurrent Registration: 500 concurrent controllers register without collision',
    async () => {
      const registry = new HttpControllerRegistry();
      const count = 500;

      await Promise.all(
        Array.from({ length: count }, (_, i) =>
          Promise.resolve().then(() =>
            registry.register({ id: `ctrl.${i}`, name: `Ctrl${i}`, execute: async () => ({}) }),
          ),
        ),
      );

      assert.strictEqual(registry.size, count);
      for (let i = 0; i < count; i++) {
        assert.ok(registry.has(`ctrl.${i}`));
      }
    },
  );

  // ─── 10. Controller Executor ───────────────────────────────────────────────

  await t.test('10. Controller Executor: executes controller successfully', async () => {
    const diagnostics = new HttpControllerDiagnostics();
    const executor = new HttpControllerExecutor(diagnostics);

    const controller: HttpController = {
      id: 'users.get.ctrl',
      name: 'GetUserCtrl',
      execute: async (ctx) => ({ id: ctx.parameters['id'], name: 'Alice' }),
    };

    const mockExecCtx = {
      signal: new AbortController().signal,
      id: 'e1',
    } as unknown as ExecutionContext;
    const ctx: HttpControllerContext = {
      request: {
        method: 'GET',
        url: '/users/42',
        path: '/users/42',
        headers: {},
        query: {},
      } as unknown as HttpRequest,
      route: { id: 'users.get', method: 'GET', path: '/users/:id', operation: 'users.get' },
      parameters: { id: '42' },
      metadata: {},
      executionContext: mockExecCtx,
    };

    const result = await executor.execute(controller, ctx);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.state, 'COMPLETED');
    assert.deepStrictEqual(result.value, { id: '42', name: 'Alice' });
    assert.ok(result.durationMs >= 0);

    const snap = diagnostics.getSnapshot();
    assert.strictEqual(snap.totalExecutions, 1);
    assert.strictEqual(snap.successfulExecutions, 1);
    assert.strictEqual(snap.activeExecutions, 0);
  });

  await t.test('10b. Controller Executor: handles execution failures safely', async () => {
    const diagnostics = new HttpControllerDiagnostics();
    const executor = new HttpControllerExecutor(diagnostics);

    const failingCtrl: HttpController = {
      id: 'fail.ctrl',
      name: 'FailCtrl',
      execute: async () => {
        throw new Error('Database connection failed');
      },
    };

    const mockExecCtx = {
      signal: new AbortController().signal,
      id: 'e2',
    } as unknown as ExecutionContext;
    const ctx: HttpControllerContext = {
      request: {
        method: 'GET',
        url: '/fail',
        path: '/fail',
        headers: {},
        query: {},
      } as unknown as HttpRequest,
      route: { id: 'fail', method: 'GET', path: '/fail', operation: 'fail' },
      parameters: {},
      metadata: {},
      executionContext: mockExecCtx,
    };

    const result = await executor.execute(failingCtrl, ctx);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.state, 'FAILED');

    const snap = diagnostics.getSnapshot();
    assert.strictEqual(snap.totalExecutions, 1);
    assert.strictEqual(snap.failedExecutions, 1);
    assert.strictEqual(snap.activeExecutions, 0);
  });

  await t.test('10c. Controller Executor: handles timeout cancellation', async () => {
    const diagnostics = new HttpControllerDiagnostics();
    const executor = new HttpControllerExecutor(diagnostics);

    const slowCtrl: HttpController = {
      id: 'slow.ctrl',
      name: 'SlowCtrl',
      execute: async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return { done: true };
      },
    };

    const mockExecCtx = {
      signal: new AbortController().signal,
      id: 'e3',
    } as unknown as ExecutionContext;
    const ctx: HttpControllerContext = {
      request: {
        method: 'GET',
        url: '/slow',
        path: '/slow',
        headers: {},
        query: {},
      } as unknown as HttpRequest,
      route: { id: 'slow', method: 'GET', path: '/slow', operation: 'slow' },
      parameters: {},
      metadata: {},
      executionContext: mockExecCtx,
    };

    const result = await executor.execute(slowCtrl, ctx, { timeoutMs: 50 });
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.state, 'FAILED');

    const snap = diagnostics.getSnapshot();
    assert.strictEqual(snap.totalExecutions, 1);
    assert.strictEqual(snap.failedExecutions, 1);
    assert.strictEqual(snap.activeExecutions, 0);
  });

  await t.test('10d. Controller Executor: handles early and in-flight cancellation', async () => {
    const diagnostics = new HttpControllerDiagnostics();
    const executor = new HttpControllerExecutor(diagnostics);

    const ctrl: HttpController = {
      id: 'abort.ctrl',
      name: 'AbortCtrl',
      execute: async () => ({ done: true }),
    };

    // Early abort
    const abortCtrl = new AbortController();
    abortCtrl.abort();

    const mockExecCtx = { signal: abortCtrl.signal, id: 'e4' } as unknown as ExecutionContext;
    const ctx: HttpControllerContext = {
      request: {
        method: 'GET',
        url: '/abort',
        path: '/abort',
        headers: {},
        query: {},
      } as unknown as HttpRequest,
      route: { id: 'abort', method: 'GET', path: '/abort', operation: 'abort' },
      parameters: {},
      metadata: {},
      executionContext: mockExecCtx,
    };

    const result = await executor.execute(ctrl, ctx);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.state, 'CANCELLED');

    const snap = diagnostics.getSnapshot();
    assert.strictEqual(snap.cancelledExecutions, 1);
  });

  // ─── 11. Controller Coordinator ────────────────────────────────────────────

  await t.test(
    '11. Controller Coordinator: registers and executes endpoints via routeId',
    async () => {
      const coordinator = new HttpControllerCoordinator();

      coordinator.registerController({
        id: 'items.ctrl',
        name: 'ItemsCtrl',
        execute: async (ctx) => ({ itemId: ctx.parameters['id'], status: 'active' }),
      });

      coordinator.registerEndpoint({
        id: 'items.get.ep',
        name: 'GetItemEndpoint',
        routeId: 'items.get',
        operation: 'items.get',
        controllerId: 'items.ctrl',
        metadata: {},
        enabled: true,
        priority: 0,
      });

      const mockExecCtx = {
        signal: new AbortController().signal,
        id: 'e5',
      } as unknown as ExecutionContext;
      const ctx: HttpControllerContext = {
        request: {
          method: 'GET',
          url: '/items/99',
          path: '/items/99',
          headers: {},
          query: {},
        } as unknown as HttpRequest,
        route: { id: 'items.get', method: 'GET', path: '/items/:id', operation: 'items.get' },
        parameters: { id: '99' },
        metadata: {},
        executionContext: mockExecCtx,
      };

      const result = await coordinator.executeByRouteId('items.get', ctx);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.state, 'COMPLETED');
      assert.deepStrictEqual(result.value, { itemId: '99', status: 'active' });

      // Missing routeId throws HttpEndpointNotFoundError
      await assert.rejects(
        async () => coordinator.executeByRouteId('missing.route', ctx),
        HttpEndpointNotFoundError,
      );
    },
  );

  await t.test('11b. Controller Coordinator: throws when controller is missing', async () => {
    const coordinator = new HttpControllerCoordinator();

    coordinator.registerEndpoint({
      id: 'orphan.ep',
      name: 'OrphanEndpoint',
      routeId: 'orphan.route',
      operation: 'orphan',
      controllerId: 'non.existent.ctrl',
      metadata: {},
      enabled: true,
      priority: 0,
    });

    const mockExecCtx = {
      signal: new AbortController().signal,
      id: 'e6',
    } as unknown as ExecutionContext;
    const ctx: HttpControllerContext = {
      request: {
        method: 'GET',
        url: '/orphan',
        path: '/orphan',
        headers: {},
        query: {},
      } as unknown as HttpRequest,
      route: { id: 'orphan.route', method: 'GET', path: '/orphan', operation: 'orphan' },
      parameters: {},
      metadata: {},
      executionContext: mockExecCtx,
    };

    await assert.rejects(
      async () => coordinator.executeByRouteId('orphan.route', ctx),
      HttpControllerExecutionError,
    );
  });

  // ─── 12. Diagnostics Numerical Purity & Profiler ──────────────────────────

  await t.test('12a. Profiler: measures elapsed execution time accurately', async () => {
    const profiler = new HttpControllerProfiler().start();
    await new Promise((resolve) => setTimeout(resolve, 10));
    const duration = profiler.stop();
    assert.ok(duration >= 5, `Expected duration >= 5ms, got ${duration}`);
  });

  await t.test(
    '12b. Diagnostics: snapshot contains pure numerical metrics and no retained objects',
    () => {
      const diagnostics = new HttpControllerDiagnostics();
      diagnostics.recordExecutionStarted();
      diagnostics.recordExecutionSuccess(15);
      diagnostics.recordExecutionStarted();
      diagnostics.recordExecutionFailure(25);
      diagnostics.recordRegistrationFailure();

      const snapshot = diagnostics.getSnapshot();
      assert.strictEqual(snapshot.totalExecutions, 2);
      assert.strictEqual(snapshot.successfulExecutions, 1);
      assert.strictEqual(snapshot.failedExecutions, 1);
      assert.strictEqual(snapshot.registrationFailures, 1);
      assert.strictEqual(snapshot.activeExecutions, 0);
      assert.strictEqual(snapshot.averageDurationMs, 20);
      assert.strictEqual(snapshot.slowestDurationMs, 25);

      diagnostics.reset();
      const resetSnap = diagnostics.getSnapshot();
      assert.strictEqual(resetSnap.totalExecutions, 0);
    },
  );

  // ─── 13. Concurrency ───────────────────────────────────────────────────────

  await t.test('13. Concurrency: 1,000 concurrent executions complete safely', async () => {
    const coordinator = new HttpControllerCoordinator();
    coordinator.registerController({
      id: 'concurrent.ctrl',
      name: 'ConcurrentCtrl',
      execute: async (ctx) => ({ id: ctx.parameters['id'] }),
    });
    coordinator.registerEndpoint({
      id: 'concurrent.ep',
      name: 'ConcurrentEp',
      routeId: 'concurrent.route',
      operation: 'concurrent',
      controllerId: 'concurrent.ctrl',
      metadata: {},
      enabled: true,
      priority: 0,
    });

    const count = 1000;
    const tasks = Array.from({ length: count }, (_, i) => {
      const mockExecCtx = {
        signal: new AbortController().signal,
        id: `e-${i}`,
      } as unknown as ExecutionContext;
      const ctx: HttpControllerContext = {
        request: {
          method: 'GET',
          url: `/c/${i}`,
          path: `/c/${i}`,
          headers: {},
          query: {},
        } as unknown as HttpRequest,
        route: { id: 'concurrent.route', method: 'GET', path: '/c/:id', operation: 'concurrent' },
        parameters: { id: String(i) },
        metadata: {},
        executionContext: mockExecCtx,
      };
      return coordinator.executeByRouteId('concurrent.route', ctx);
    });

    const results = await Promise.all(tasks);
    assert.strictEqual(results.length, count);
    for (let i = 0; i < count; i++) {
      assert.strictEqual(results[i].success, true);
      assert.deepStrictEqual(results[i].value, { id: String(i) });
    }

    const diag = coordinator.getDiagnostics();
    assert.strictEqual(diag.totalExecutions, count);
    assert.strictEqual(diag.successfulExecutions, count);
    assert.strictEqual(diag.activeExecutions, 0);
  });
});
