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
  HttpControllerDuplicateError,
  HttpControllerError,
  HttpControllerExecutionError,
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
});
