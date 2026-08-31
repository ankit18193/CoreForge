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
  HttpControllerSnapshot,
  HttpControllerStateError,
  HttpControllerTimeoutError,
  HttpControllerValidationError,
  HttpControllerValidator,
  HttpEndpointDuplicateError,
  HttpEndpointError,
  HttpEndpointNotFoundError,
  HttpEndpointRegistrationError,
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
});
