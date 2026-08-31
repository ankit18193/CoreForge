import * as assert from 'node:assert';
import { test } from 'node:test';

import type {
  ExecutionContext,
  HttpBindingContext,
  HttpBindingDefinition,
  HttpRequest,
} from '@coreforge/contracts';

import {
  HttpBindingConfigurationError,
  HttpBindingDefinitionError,
  HttpBindingError,
  HttpBindingExecutionError,
  HttpBindingMissingFieldError,
  HttpBindingPlan,
  HttpBindingRegistry,
  HttpBindingResolver,
  HttpBindingSnapshot,
  HttpBindingTransformationError,
  HttpBindingTypeError,
  HttpBindingValidationError,
  HttpBindingValidator,
  HttpError,
  HttpValueExtractor,
} from '../src/index';

test('CoreForge HTTP Request Binding & Validation Engine (@coreforge/http)', async (t) => {
  // ─── 1. Error Hierarchy & Codes ─────────────────────────────────────────────

  await t.test(
    '1. Error Hierarchy: all binding errors inherit correctly with CF-HTTP-BINDING codes',
    () => {
      const base = new HttpBindingError('base');
      assert.ok(base instanceof HttpError);
      assert.ok(base instanceof HttpBindingError);
      assert.strictEqual(base.name, 'HttpBindingError');
      assert.strictEqual(base.code, 'CF-HTTP-BINDING');

      const configErr = new HttpBindingConfigurationError('config error');
      assert.ok(configErr instanceof HttpBindingError);
      assert.strictEqual(configErr.name, 'HttpBindingConfigurationError');
      assert.strictEqual(configErr.code, 'CF-HTTP-BINDING-CONFIG');

      const defErr = new HttpBindingDefinitionError('def error', 'page', 'QUERY');
      assert.ok(defErr instanceof HttpBindingError);
      assert.strictEqual(defErr.name, 'HttpBindingDefinitionError');
      assert.strictEqual(defErr.code, 'CF-HTTP-BINDING-DEFINITION');
      assert.strictEqual(defErr.field, 'page');
      assert.strictEqual(defErr.source, 'QUERY');

      const valErr = new HttpBindingValidationError('validation error', [
        { field: 'email', source: 'BODY', code: 'INVALID_EMAIL', message: 'Malformed email' },
      ]);
      assert.ok(valErr instanceof HttpBindingError);
      assert.strictEqual(valErr.name, 'HttpBindingValidationError');
      assert.strictEqual(valErr.code, 'CF-HTTP-BINDING-VALIDATION');
      assert.strictEqual(valErr.errors.length, 1);
      assert.strictEqual(valErr.errors[0].field, 'email');
      assert.ok(Object.isFrozen(valErr.errors));

      const missingErr = new HttpBindingMissingFieldError('userId', 'PATH');
      assert.ok(missingErr instanceof HttpBindingError);
      assert.strictEqual(missingErr.name, 'HttpBindingMissingFieldError');
      assert.strictEqual(missingErr.code, 'CF-HTTP-BINDING-MISSING-FIELD');
      assert.strictEqual(missingErr.field, 'userId');
      assert.strictEqual(missingErr.source, 'PATH');
      assert.ok(missingErr.message.includes('userId'));

      const typeErr = new HttpBindingTypeError('age', 'INTEGER', 'string');
      assert.ok(typeErr instanceof HttpBindingError);
      assert.strictEqual(typeErr.name, 'HttpBindingTypeError');
      assert.strictEqual(typeErr.code, 'CF-HTTP-BINDING-TYPE');
      assert.strictEqual(typeErr.field, 'age');
      assert.strictEqual(typeErr.expectedType, 'INTEGER');
      assert.strictEqual(typeErr.receivedType, 'string');

      const transErr = new HttpBindingTransformationError('limit', 'NUMBER');
      assert.ok(transErr instanceof HttpBindingError);
      assert.strictEqual(transErr.name, 'HttpBindingTransformationError');
      assert.strictEqual(transErr.code, 'CF-HTTP-BINDING-TRANSFORMATION');
      assert.strictEqual(transErr.field, 'limit');
      assert.strictEqual(transErr.targetType, 'NUMBER');

      const execErr = new HttpBindingExecutionError('exec failed', 'binder-1');
      assert.ok(execErr instanceof HttpBindingError);
      assert.strictEqual(execErr.name, 'HttpBindingExecutionError');
      assert.strictEqual(execErr.code, 'CF-HTTP-BINDING-EXECUTION');
      assert.strictEqual(execErr.binderId, 'binder-1');
    },
  );

  // ─── 2. Binding Definition Validation ───────────────────────────────────────

  await t.test('2a. HttpBindingValidator: validates valid single definitions', () => {
    const def1: HttpBindingDefinition = {
      source: 'PATH',
      field: 'id',
      target: 'userId',
      required: true,
      type: 'STRING',
    };
    const validated1 = HttpBindingValidator.validate(def1);
    assert.strictEqual(validated1.source, 'PATH');
    assert.strictEqual(validated1.field, 'id');
    assert.strictEqual(validated1.target, 'userId');
    assert.strictEqual(validated1.required, true);
    assert.strictEqual(validated1.type, 'STRING');

    // Field default to target when omitted for non-BODY
    const def2 = {
      source: 'QUERY' as const,
      target: 'page',
      type: 'INTEGER' as const,
    };
    const validated2 = HttpBindingValidator.validate(def2);
    assert.strictEqual(validated2.field, 'page');
    assert.strictEqual(validated2.required, false);

    // Full BODY binding without field
    const def3 = {
      source: 'BODY' as const,
      target: 'payload',
      type: 'OBJECT' as const,
    };
    const validated3 = HttpBindingValidator.validate(def3);
    assert.strictEqual(validated3.source, 'BODY');
    assert.strictEqual(validated3.field, undefined);
  });

  await t.test(
    '2b. HttpBindingValidator: validates list of definitions without duplicate targets',
    () => {
      const list = [
        { source: 'PATH' as const, field: 'id', target: 'userId', type: 'STRING' as const },
        { source: 'QUERY' as const, field: 'page', target: 'page', type: 'INTEGER' as const },
        {
          source: 'HEADER' as const,
          field: 'x-api-key',
          target: 'apiKey',
          type: 'STRING' as const,
        },
        {
          source: 'COOKIE' as const,
          field: 'session',
          target: 'sessionId',
          type: 'STRING' as const,
        },
        { source: 'BODY' as const, target: 'data', type: 'OBJECT' as const },
      ];
      const validated = HttpBindingValidator.validateMany(list);
      assert.strictEqual(validated.length, 5);
      assert.ok(Object.isFrozen(validated));
    },
  );

  await t.test('2c. HttpBindingValidator: rejects invalid definitions', () => {
    assert.throws(() => HttpBindingValidator.validate(null), HttpBindingDefinitionError);
    assert.throws(() => HttpBindingValidator.validate('not an object'), HttpBindingDefinitionError);

    // Invalid source
    assert.throws(
      () => HttpBindingValidator.validate({ source: 'INVALID', target: 'x' }),
      HttpBindingDefinitionError,
    );

    // Missing / empty target
    assert.throws(
      () => HttpBindingValidator.validate({ source: 'QUERY', target: '' }),
      HttpBindingDefinitionError,
    );
    assert.throws(
      () => HttpBindingValidator.validate({ source: 'QUERY', target: '   ' }),
      HttpBindingDefinitionError,
    );

    // Empty field
    assert.throws(
      () => HttpBindingValidator.validate({ source: 'QUERY', target: 'x', field: '' }),
      HttpBindingDefinitionError,
    );

    // Invalid type
    assert.throws(
      () => HttpBindingValidator.validate({ source: 'QUERY', target: 'x', type: 'UNKNOWN' }),
      HttpBindingDefinitionError,
    );

    // Invalid required type
    assert.throws(
      () => HttpBindingValidator.validate({ source: 'QUERY', target: 'x', required: 'yes' }),
      HttpBindingDefinitionError,
    );

    // Invalid metadata
    assert.throws(
      () => HttpBindingValidator.validate({ source: 'QUERY', target: 'x', metadata: 'not-object' }),
      HttpBindingDefinitionError,
    );

    // Non-array validateMany
    assert.throws(
      () => HttpBindingValidator.validateMany('not an array'),
      HttpBindingDefinitionError,
    );

    // Duplicate target in validateMany
    assert.throws(
      () =>
        HttpBindingValidator.validateMany([
          { source: 'PATH', field: 'id', target: 'duplicated' },
          { source: 'QUERY', field: 'q', target: 'duplicated' },
        ]),
      HttpBindingDefinitionError,
    );
  });

  // ─── 3. Immutable Snapshot & Deep Freezing ──────────────────────────────────

  await t.test('3a. HttpBindingSnapshot: creates deep-frozen binding definition', () => {
    const def: HttpBindingDefinition = {
      source: 'QUERY',
      field: 'filter',
      target: 'filter',
      type: 'OBJECT',
      defaultValue: { active: true, tags: ['a', 'b'] },
      metadata: { description: 'Filter params' },
    };

    const snapshot = HttpBindingSnapshot.createDefinition(def);
    assert.ok(Object.isFrozen(snapshot));
    assert.ok(Object.isFrozen(snapshot.defaultValue));
    assert.ok(Object.isFrozen(snapshot.metadata));

    assert.throws(() => {
      (snapshot as unknown as Record<string, unknown>).target = 'mutated';
    });
    assert.throws(() => {
      (snapshot.defaultValue as Record<string, unknown>).active = false;
    });
  });

  await t.test('3b. HttpBindingSnapshot: creates deep-frozen binding context', () => {
    const mockExecCtx = {
      id: 'exec-bind-1',
      signal: new AbortController().signal,
    } as unknown as ExecutionContext;

    const ctx: HttpBindingContext = {
      request: {
        method: 'GET',
        url: '/users/42?page=2',
        path: '/users/42',
        headers: { authorization: 'Bearer token' },
        query: { page: '2' },
      } as unknown as HttpRequest,
      route: { id: 'users.get', method: 'GET', path: '/users/:id', operation: 'users.get' },
      parameters: { id: '42' },
      metadata: { scope: 'read:users' },
      executionContext: mockExecCtx,
    };

    const snapshot = HttpBindingSnapshot.createContext(ctx);
    assert.ok(Object.isFrozen(snapshot));
    assert.ok(Object.isFrozen(snapshot.request));
    assert.ok(Object.isFrozen(snapshot.route));
    assert.ok(Object.isFrozen(snapshot.parameters));
    assert.ok(Object.isFrozen(snapshot.metadata));

    assert.throws(() => {
      (snapshot.parameters as Record<string, string>).id = '999';
    });
  });

  await t.test(
    '3c. HttpBindingSnapshot: creates deep-frozen binding result with error details',
    () => {
      const result = HttpBindingSnapshot.createResult(false, 3.5, undefined, [
        {
          field: 'email',
          source: 'BODY',
          code: 'INVALID_FORMAT',
          message: 'Invalid email address',
        },
      ]);

      assert.ok(Object.isFrozen(result));
      assert.ok(Object.isFrozen(result.errors));
      assert.ok(Object.isFrozen(result.errors[0]));
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.durationMs, 3.5);
      assert.strictEqual(result.errors[0].code, 'INVALID_FORMAT');

      assert.throws(() => {
        (result as unknown as Record<string, unknown>).success = true;
      });
    },
  );

  await t.test(
    '3d. HttpBindingSnapshot: deepFreeze safely handles circular references without infinite recursion',
    () => {
      const circular: Record<string, unknown> = { name: 'test' };
      circular['self'] = circular;

      const frozen = HttpBindingSnapshot.deepFreeze(circular);
      assert.ok(Object.isFrozen(frozen));
      assert.strictEqual(frozen.name, 'test');
      assert.strictEqual(frozen['self'], frozen);
    },
  );

  // ─── 4. Value Extraction ───────────────────────────────────────────────────

  await t.test(
    '4a. HttpValueExtractor: extracts from PATH, QUERY, HEADER, COOKIE, and BODY',
    () => {
      const request: HttpRequest = {
        method: 'POST',
        url: '/users/usr-42?page=5&sort=desc',
        path: '/users/usr-42',
        pathParameters: { id: 'usr-42' },
        query: { page: '5', sort: 'desc' },
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': 'secret-key-123',
          Authorization: 'Bearer token-abc',
        },
        cookies: {
          sessionId: 'sess-999',
        },
        body: {
          username: 'john_doe',
          profile: { age: 30 },
        },
      };

      // PATH
      assert.strictEqual(HttpValueExtractor.extractFromSource(request, 'PATH', 'id'), 'usr-42');
      assert.strictEqual(
        HttpValueExtractor.extractFromSource(request, 'PATH', 'nonexistent'),
        undefined,
      );

      // QUERY
      assert.strictEqual(HttpValueExtractor.extractFromSource(request, 'QUERY', 'page'), '5');
      assert.strictEqual(HttpValueExtractor.extractFromSource(request, 'QUERY', 'sort'), 'desc');
      assert.strictEqual(
        HttpValueExtractor.extractFromSource(request, 'QUERY', 'missing'),
        undefined,
      );

      // HEADER (case-insensitive)
      assert.strictEqual(
        HttpValueExtractor.extractFromSource(request, 'HEADER', 'x-api-key'),
        'secret-key-123',
      );
      assert.strictEqual(
        HttpValueExtractor.extractFromSource(request, 'HEADER', 'X-API-KEY'),
        'secret-key-123',
      );
      assert.strictEqual(
        HttpValueExtractor.extractFromSource(request, 'HEADER', 'authorization'),
        'Bearer token-abc',
      );
      assert.strictEqual(
        HttpValueExtractor.extractFromSource(request, 'HEADER', 'missing-header'),
        undefined,
      );

      // COOKIE
      assert.strictEqual(
        HttpValueExtractor.extractFromSource(request, 'COOKIE', 'sessionId'),
        'sess-999',
      );
      assert.strictEqual(
        HttpValueExtractor.extractFromSource(request, 'COOKIE', 'missing-cookie'),
        undefined,
      );

      // BODY (field vs full object)
      assert.strictEqual(
        HttpValueExtractor.extractFromSource(request, 'BODY', 'username'),
        'john_doe',
      );
      assert.deepStrictEqual(HttpValueExtractor.extractFromSource(request, 'BODY'), {
        username: 'john_doe',
        profile: { age: 30 },
      });
    },
  );

  await t.test('4b. HttpValueExtractor: extract method using HttpBindingDefinition', () => {
    const request: HttpRequest = {
      method: 'GET',
      url: '/items/item-10',
      path: '/items/item-10',
      pathParameters: { itemId: 'item-10' },
      query: { filter: 'active' },
      headers: { 'X-Tenant-ID': 'tenant-alpha' },
    };

    const pathDef: HttpBindingDefinition = { source: 'PATH', field: 'itemId', target: 'id' };
    const queryDef: HttpBindingDefinition = { source: 'QUERY', field: 'filter', target: 'status' };
    const headerDef: HttpBindingDefinition = {
      source: 'HEADER',
      field: 'x-tenant-id',
      target: 'tenantId',
    };

    assert.strictEqual(HttpValueExtractor.extract(request, pathDef), 'item-10');
    assert.strictEqual(HttpValueExtractor.extract(request, queryDef), 'active');
    assert.strictEqual(HttpValueExtractor.extract(request, headerDef), 'tenant-alpha');
  });

  // ─── 5. Binding Plan ────────────────────────────────────────────────────────

  await t.test('5. HttpBindingPlan: compiles immutable deterministic plan', () => {
    const plan = HttpBindingPlan.create([
      { source: 'PATH', field: 'id', target: 'userId' },
      { source: 'QUERY', field: 'page', target: 'page', defaultValue: 1 },
      { source: 'HEADER', field: 'x-api-key', target: 'apiKey' },
    ]);

    assert.strictEqual(plan.size, 3);
    assert.ok(plan.hasTarget('userId'));
    assert.ok(plan.hasTarget('page'));
    assert.ok(plan.hasTarget('apiKey'));
    assert.strictEqual(plan.hasTarget('nonexistent'), false);

    const userDef = plan.getByTarget('userId');
    assert.ok(userDef);
    assert.strictEqual(userDef.source, 'PATH');
    assert.strictEqual(userDef.field, 'id');
  });

  // ─── 6. Binding Registry ────────────────────────────────────────────────────

  await t.test('6. HttpBindingRegistry: registers, retrieves, and locks plans', () => {
    const registry = new HttpBindingRegistry();
    assert.strictEqual(registry.size, 0);
    assert.strictEqual(registry.locked, false);

    const plan1 = HttpBindingPlan.create([{ source: 'PATH', field: 'id', target: 'id' }]);
    registry.register('users.get', plan1);

    assert.strictEqual(registry.size, 1);
    assert.ok(registry.has('users.get'));
    assert.strictEqual(registry.get('users.get')?.size, 1);
    assert.deepStrictEqual(registry.list(), ['users.get']);

    // Duplicate registration throws
    assert.throws(() => registry.register('users.get', plan1), HttpBindingConfigurationError);

    // Empty ID throws
    assert.throws(() => registry.register('', plan1), HttpBindingConfigurationError);

    // Lock prevents registration
    registry.lock();
    assert.strictEqual(registry.locked, true);
    assert.throws(() => registry.register('new.plan', plan1), HttpBindingConfigurationError);

    // Lock prevents clear
    assert.throws(() => registry.clear(), HttpBindingConfigurationError);
  });

  // ─── 7. Binding Resolver ────────────────────────────────────────────────────

  await t.test(
    '7. HttpBindingResolver: resolves plan and extracts raw values with defaults',
    () => {
      const registry = new HttpBindingRegistry();
      const plan = HttpBindingPlan.create([
        { source: 'PATH', field: 'id', target: 'userId' },
        { source: 'QUERY', field: 'page', target: 'page', defaultValue: 1 },
        { source: 'QUERY', field: 'limit', target: 'limit', defaultValue: 20 },
        { source: 'HEADER', field: 'x-tenant', target: 'tenantId', defaultValue: 'default-tenant' },
      ]);
      registry.register('search.plan', plan);

      const resolver = new HttpBindingResolver(registry);
      assert.strictEqual(resolver.resolvePlan('search.plan'), plan);
      assert.strictEqual(resolver.resolvePlan('missing'), undefined);

      const mockExecCtx = {
        id: 'e-1',
        signal: new AbortController().signal,
      } as unknown as ExecutionContext;

      const ctx: HttpBindingContext = {
        request: {
          method: 'GET',
          url: '/search/usr-99?limit=50',
          path: '/search/usr-99',
          pathParameters: { id: 'usr-99' },
          query: { limit: '50' }, // page is omitted -> should take default 1
          headers: {}, // tenant is omitted -> should take default 'default-tenant'
        } as unknown as HttpRequest,
        parameters: { id: 'usr-99' },
        metadata: {},
        executionContext: mockExecCtx,
      };

      const resolvedValues = resolver.extractValues(plan, ctx);
      assert.deepStrictEqual(resolvedValues, {
        userId: 'usr-99',
        page: 1,
        limit: '50',
        tenantId: 'default-tenant',
      });
    },
  );
});
