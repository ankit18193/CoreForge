import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { test } from 'node:test';

import type {
  HttpMethod,
  HttpRoute,
  HttpRouteMatch,
  HttpRouteOptions,
  HttpRouteRegistry as IHttpRouteRegistry,
  HttpRouteResolver as IHttpRouteResolver,
  HttpRoutingDiagnosticsSnapshot,
  HttpRoutingOptions,
  HttpRoutingResult,
} from '@coreforge/contracts';
import { CoreForgeError } from '@coreforge/errors';

import {
  HttpError,
  HttpMethodNotAllowedError,
  HttpParameterError,
  HttpRouteConflictError,
  HttpRouteDuplicateError,
  HttpRouteNotFoundError,
  HttpRouteRegistrationError,
  HttpRouteRegistry,
  HttpRouteResolver,
  HttpRouteSnapshot,
  HttpRouteValidationError,
  HttpRouteValidator,
  HttpRoutingError,
} from '../src/index';

test('CoreForge HTTP Routing Engine (@coreforge/http) — Stage 1: Route Contracts & Definitions', async (t) => {
  // =========================================================================
  // 1. CONTRACTS & TYPES
  // =========================================================================
  await t.test('1. Routing contract types and interfaces are valid', () => {
    const method: HttpMethod = 'GET';
    assert.strictEqual(method, 'GET');

    const route: HttpRoute = {
      id: 'get-users',
      method: 'GET',
      path: '/api/v1/users',
      operation: 'users.list',
      priority: 10,
      metadata: { authRequired: true },
    };
    assert.strictEqual(route.id, 'get-users');
    assert.strictEqual(route.method, 'GET');
    assert.strictEqual(route.path, '/api/v1/users');
    assert.strictEqual(route.operation, 'users.list');
    assert.strictEqual(route.priority, 10);
    assert.strictEqual(route.metadata?.authRequired, true);

    const options: HttpRouteOptions = {
      priority: 20,
      metadata: { cacheable: false },
    };
    assert.strictEqual(options.priority, 20);

    const routingOpts: HttpRoutingOptions = {
      strictTrailingSlash: false,
      caseSensitive: true,
      defaultPriority: 50,
    };
    assert.strictEqual(routingOpts.defaultPriority, 50);

    const dummyRegistry: IHttpRouteRegistry = {
      size: 1,
      locked: false,
      register(_r, _o) {},
      get(_id) {
        return route;
      },
      list() {
        return [route];
      },
      lock() {},
    };
    assert.strictEqual(dummyRegistry.size, 1);

    const dummyResolver: IHttpRouteResolver = {
      resolve(_method, _path) {
        return undefined;
      },
      match(_req) {
        return undefined;
      },
    };
    assert.strictEqual(typeof dummyResolver.resolve, 'function');

    const match: HttpRouteMatch = {
      routeId: 'get-user-by-id',
      method: 'GET',
      path: '/api/v1/users/:id',
      operation: 'users.get',
      parameters: { id: '42' },
      metadata: { version: '1.0' },
    };
    assert.strictEqual(match.routeId, 'get-user-by-id');
    assert.strictEqual(match.parameters.id, '42');

    const routingResult: HttpRoutingResult = {
      matched: true,
      match,
    };
    assert.strictEqual(routingResult.matched, true);

    const diagSnapshot: HttpRoutingDiagnosticsSnapshot = {
      totalRouteResolutions: 100,
      successfulResolutions: 95,
      routeNotFound: 3,
      methodNotAllowed: 2,
      parameterExtractionFailures: 0,
      registrationFailures: 0,
      resolutionFailures: 0,
      activeResolutions: 0,
      averageResolutionDurationMs: 0.12,
      slowestResolutionDurationMs: 1.5,
    };
    assert.strictEqual(diagSnapshot.totalRouteResolutions, 100);
    assert.strictEqual(diagSnapshot.successfulResolutions, 95);
  });

  // =========================================================================
  // 2. ERROR HIERARCHY
  // =========================================================================
  await t.test(
    '2. Routing error hierarchy inherits correctly with expected codes and properties',
    () => {
      const baseErr = new HttpRoutingError('Routing error');
      assert.ok(baseErr instanceof CoreForgeError);
      assert.ok(baseErr instanceof HttpError);
      assert.ok(baseErr instanceof HttpRoutingError);
      assert.strictEqual(baseErr.code, 'CF-HTTP-ROUTING');
      assert.strictEqual(baseErr.name, 'HttpRoutingError');

      const regErr = new HttpRouteRegistrationError('Registration failed');
      assert.ok(regErr instanceof HttpRoutingError);
      assert.strictEqual(regErr.code, 'CF-HTTP-ROUTE-REGISTRATION');

      const dupErr = new HttpRouteDuplicateError('users.get', 'Duplicate route ID users.get');
      assert.ok(dupErr instanceof HttpRoutingError);
      assert.strictEqual(dupErr.code, 'CF-HTTP-ROUTE-DUPLICATE');
      assert.strictEqual(dupErr.routeId, 'users.get');

      const valErr = new HttpRouteValidationError('Invalid path');
      assert.ok(valErr instanceof HttpRoutingError);
      assert.strictEqual(valErr.code, 'CF-HTTP-ROUTE-VALIDATION');

      const notFoundErr = new HttpRouteNotFoundError('GET', '/unknown');
      assert.ok(notFoundErr instanceof HttpRoutingError);
      assert.strictEqual(notFoundErr.code, 'CF-HTTP-ROUTE-NOT-FOUND');
      assert.strictEqual(notFoundErr.method, 'GET');
      assert.strictEqual(notFoundErr.path, '/unknown');

      const notAllowedErr = new HttpMethodNotAllowedError('POST', '/users/42', ['GET', 'DELETE']);
      assert.ok(notAllowedErr instanceof HttpRoutingError);
      assert.strictEqual(notAllowedErr.code, 'CF-HTTP-METHOD-NOT-ALLOWED');
      assert.strictEqual(notAllowedErr.method, 'POST');
      assert.strictEqual(notAllowedErr.path, '/users/42');
      assert.deepStrictEqual(notAllowedErr.allowedMethods, ['GET', 'DELETE']);

      const conflictErr = new HttpRouteConflictError('Route conflict');
      assert.ok(conflictErr instanceof HttpRoutingError);
      assert.strictEqual(conflictErr.code, 'CF-HTTP-ROUTE-CONFLICT');

      const paramErr = new HttpParameterError('Invalid param', 'userId');
      assert.ok(paramErr instanceof HttpRoutingError);
      assert.strictEqual(paramErr.code, 'CF-HTTP-PARAMETER');
      assert.strictEqual(paramErr.parameterName, 'userId');
    },
  );

  // =========================================================================
  // 3. ROUTE VALIDATOR
  // =========================================================================
  await t.test(
    '3. HttpRouteValidator: Structural validation and rejection of invalid routes',
    () => {
      // Null and non-object checks
      assert.throws(
        () => HttpRouteValidator.validate(null),
        (err: Error) => err instanceof HttpRouteValidationError,
      );
      assert.throws(
        () => HttpRouteValidator.validate(undefined),
        (err: Error) => err instanceof HttpRouteValidationError,
      );
      assert.throws(
        () => HttpRouteValidator.validate('GET /users'),
        (err: Error) => err instanceof HttpRouteValidationError,
      );
      assert.throws(
        () => HttpRouteValidator.validate([]),
        (err: Error) => err instanceof HttpRouteValidationError,
      );

      // Invalid ID
      assert.throws(
        () =>
          HttpRouteValidator.validate({ id: '', method: 'GET', path: '/users', operation: 'op' }),
        (err: Error) => err instanceof HttpRouteValidationError,
      );
      assert.throws(
        () =>
          HttpRouteValidator.validate({
            id: '   ',
            method: 'GET',
            path: '/users',
            operation: 'op',
          }),
        (err: Error) => err instanceof HttpRouteValidationError,
      );
      assert.throws(
        () =>
          HttpRouteValidator.validate({ id: 123, method: 'GET', path: '/users', operation: 'op' }),
        (err: Error) => err instanceof HttpRouteValidationError,
      );

      // Invalid Method
      assert.throws(
        () =>
          HttpRouteValidator.validate({
            id: 'route-1',
            method: 'INVALID',
            path: '/users',
            operation: 'op',
          }),
        (err: Error) => err instanceof HttpRouteValidationError,
      );

      // Invalid Path
      assert.throws(
        () =>
          HttpRouteValidator.validate({ id: 'route-1', method: 'GET', path: '', operation: 'op' }),
        (err: Error) => err instanceof HttpRouteValidationError,
      );
      assert.throws(
        () =>
          HttpRouteValidator.validate({
            id: 'route-1',
            method: 'GET',
            path: 'users/123',
            operation: 'op',
          }),
        (err: Error) => err instanceof HttpRouteValidationError,
      );

      // Invalid Operation
      assert.throws(
        () =>
          HttpRouteValidator.validate({
            id: 'route-1',
            method: 'GET',
            path: '/users',
            operation: '',
          }),
        (err: Error) => err instanceof HttpRouteValidationError,
      );

      // Invalid Priority
      assert.throws(
        () =>
          HttpRouteValidator.validate({
            id: 'route-1',
            method: 'GET',
            path: '/users',
            operation: 'op',
            priority: -5,
          }),
        (err: Error) => err instanceof HttpRouteValidationError,
      );

      // Invalid Metadata
      assert.throws(
        () =>
          HttpRouteValidator.validate({
            id: 'route-1',
            method: 'GET',
            path: '/users',
            operation: 'op',
            metadata: 'string',
          }),
        (err: Error) => err instanceof HttpRouteValidationError,
      );

      // Valid Route
      const valid = HttpRouteValidator.validate({
        id: '  get-user  ',
        method: 'get',
        path: '  /users/:id  ',
        operation: '  users.get  ',
        priority: 100,
        metadata: { scoped: true },
      });

      assert.strictEqual(valid.id, 'get-user');
      assert.strictEqual(valid.method, 'GET');
      assert.strictEqual(valid.path, '/users/:id');
      assert.strictEqual(valid.operation, 'users.get');
      assert.strictEqual(valid.priority, 100);
      assert.deepStrictEqual(valid.metadata, { scoped: true });
    },
  );

  // =========================================================================
  // 4. ROUTE SNAPSHOT & IMMUTABILITY
  // =========================================================================
  await t.test(
    '4. HttpRouteSnapshot: Normalization, deep cloning, circular reference handling, and deep freeze',
    () => {
      // Path normalization: trailing slash removal
      assert.strictEqual(HttpRouteSnapshot.normalizePath('/users/'), '/users');
      assert.strictEqual(HttpRouteSnapshot.normalizePath('///users///123/'), '/users/123');
      assert.strictEqual(HttpRouteSnapshot.normalizePath('/'), '/');
      assert.strictEqual(HttpRouteSnapshot.normalizePath('users'), '/users');

      // Producer mutation isolation
      const rawMetadata = { tags: ['public', 'v1'], flags: { auth: true } };
      const rawRoute = {
        id: 'list-users',
        method: 'GET',
        path: '/api/v1/users/',
        operation: 'users.list',
        priority: 50,
        metadata: rawMetadata,
      };

      const snapshot = HttpRouteSnapshot.create(rawRoute);

      // Verify normalization
      assert.strictEqual(snapshot.path, '/api/v1/users');
      assert.strictEqual(snapshot.method, 'GET');

      // Mutate original metadata
      rawMetadata.tags.push('mutated');
      rawMetadata.flags.auth = false;

      // Snapshot must remain pristine
      assert.deepStrictEqual(snapshot.metadata?.tags, ['public', 'v1']);
      assert.strictEqual((snapshot.metadata?.flags as Record<string, unknown>).auth, true);

      // Deep freeze verification
      assert.ok(Object.isFrozen(snapshot));
      assert.ok(Object.isFrozen(snapshot.metadata));
      assert.ok(Object.isFrozen(snapshot.metadata?.tags));

      assert.throws(() => {
        (snapshot as { path: string }).path = '/mutated';
      });

      // Circular reference handling
      const cyclicMetadata: Record<string, unknown> = { env: 'prod' };
      cyclicMetadata.self = cyclicMetadata;

      const cyclicSnapshot = HttpRouteSnapshot.create({
        id: 'cyclic-route',
        method: 'POST',
        path: '/cyclic',
        operation: 'cyclic.op',
        metadata: cyclicMetadata,
      });

      assert.strictEqual(cyclicSnapshot.metadata?.env, 'prod');
      assert.strictEqual(cyclicSnapshot.metadata?.self, '[Circular]');
      assert.ok(Object.isFrozen(cyclicSnapshot));
    },
  );

  // =========================================================================
  // 5. ROUTE REGISTRY & IMMUTABILITY (Stage 2)
  // =========================================================================
  await t.test(
    '5. HttpRouteRegistry: Registration, O(1) retrieval, duplicate prevention, and locking',
    () => {
      const registry = new HttpRouteRegistry();
      assert.strictEqual(registry.size, 0);
      assert.strictEqual(registry.locked, false);

      // 1. Register routes
      registry.register({
        id: 'users.list',
        method: 'GET',
        path: '/users',
        operation: 'users.list',
      });
      registry.register({
        id: 'users.get',
        method: 'GET',
        path: '/users/:id',
        operation: 'users.get',
        priority: 10,
      });

      assert.strictEqual(registry.size, 2);

      // 2. O(1) retrieval
      const r1 = registry.get('users.list');
      assert.strictEqual(r1?.id, 'users.list');
      assert.strictEqual(r1?.path, '/users');

      const nonExistent = registry.get('unknown');
      assert.strictEqual(nonExistent, undefined);

      // 3. List
      const all = registry.list();
      assert.strictEqual(all.length, 2);
      assert.ok(Object.isFrozen(all));

      // 4. Duplicate ID rejection
      assert.throws(
        () =>
          registry.register({
            id: 'users.list',
            method: 'POST',
            path: '/users/new',
            operation: 'users.create',
          }),
        (err: Error) => err instanceof HttpRouteDuplicateError && err.routeId === 'users.list',
      );

      // 5. Locking
      registry.lock();
      assert.strictEqual(registry.locked, true);

      assert.throws(
        () =>
          registry.register({
            id: 'users.create',
            method: 'POST',
            path: '/users',
            operation: 'users.create',
          }),
        (err: Error) => err instanceof HttpRouteRegistrationError,
      );
    },
  );

  // =========================================================================
  // 6. ROUTE RESOLUTION & DETERMINISTIC PRECEDENCE (Stage 2)
  // =========================================================================
  await t.test(
    '6. HttpRouteResolver: Specificity-first precedence (static beats parameterized regardless of priority)',
    () => {
      const registry = new HttpRouteRegistry();

      // Parameter route registered FIRST with HIGH priority
      registry.register({
        id: 'user.param',
        method: 'GET',
        path: '/users/:id',
        operation: 'users.getById',
        priority: 1000, // Very high priority
      });

      // Static route registered SECOND with LOW priority
      registry.register({
        id: 'user.me',
        method: 'GET',
        path: '/users/me',
        operation: 'users.getMe',
        priority: 1, // Low priority
      });

      const resolver = new HttpRouteResolver(registry);

      // Resolving /users/me MUST resolve to static route (specificity wins before priority)
      const matchMe = resolver.resolve('GET', '/users/me');
      assert.strictEqual(matchMe?.routeId, 'user.me');
      assert.strictEqual(matchMe?.operation, 'users.getMe');
      assert.deepStrictEqual(matchMe?.parameters, {});

      // Resolving /users/42 MUST resolve to parameter route
      const match42 = resolver.resolve('GET', '/users/42');
      assert.strictEqual(match42?.routeId, 'user.param');
      assert.strictEqual(match42?.operation, 'users.getById');
      assert.deepStrictEqual(match42?.parameters, { id: '42' });
    },
  );

  await t.test(
    '7. HttpRouteResolver: Deterministic tie-breaking by priority DESC and registration sequence ASC',
    () => {
      const registry = new HttpRouteRegistry();

      // Two routes with same shape/specificity: priority wins
      registry.register({
        id: 'op.low',
        method: 'POST',
        path: '/action/:actionId',
        operation: 'action.low',
        priority: 10,
      });
      registry.register({
        id: 'op.high',
        method: 'POST',
        path: '/action/:id',
        operation: 'action.high',
        priority: 50,
      });

      const resolver = new HttpRouteResolver(registry);
      const matchAction = resolver.resolve('POST', '/action/run');
      assert.strictEqual(matchAction?.routeId, 'op.high');
      assert.strictEqual(matchAction?.operation, 'action.high');
      assert.strictEqual(matchAction?.parameters.id, 'run');

      // Two routes with same shape and same priority: sequence ASC wins
      const registry2 = new HttpRouteRegistry();
      registry2.register({
        id: 'first.registered',
        method: 'PUT',
        path: '/item/:id',
        operation: 'item.first',
        priority: 20,
      });
      registry2.register({
        id: 'second.registered',
        method: 'PUT',
        path: '/item/:itemId',
        operation: 'item.second',
        priority: 20,
      });

      const resolver2 = new HttpRouteResolver(registry2);
      const matchItem = resolver2.resolve('PUT', '/item/abc');
      assert.strictEqual(matchItem?.routeId, 'first.registered');
      assert.strictEqual(matchItem?.operation, 'item.first');
      assert.strictEqual(matchItem?.parameters.id, 'abc');
    },
  );

  await t.test('8. HttpRouteResolver: Multi-parameter extraction and URL decoding', () => {
    const registry = new HttpRouteRegistry();
    registry.register({
      id: 'org.project.resource',
      method: 'GET',
      path: '/orgs/:orgId/projects/:projectId/resources/:resourceId',
      operation: 'resource.get',
    });

    const resolver = new HttpRouteResolver(registry);
    const match = resolver.resolve('GET', '/orgs/acme%20corp/projects/proj-101/resources/res%2399');

    assert.strictEqual(match?.routeId, 'org.project.resource');
    assert.strictEqual(match?.operation, 'resource.get');
    assert.deepStrictEqual(match?.parameters, {
      orgId: 'acme corp',
      projectId: 'proj-101',
      resourceId: 'res#99',
    });
    assert.ok(Object.isFrozen(match));
    assert.ok(Object.isFrozen(match?.parameters));
  });

  await t.test(
    '9. HttpRouteResolver: Method filtering and findAllowedMethodsForPath for 405 distinction',
    () => {
      const registry = new HttpRouteRegistry();
      registry.register({
        id: 'users.get',
        method: 'GET',
        path: '/users/:id',
        operation: 'users.get',
      });
      registry.register({
        id: 'users.delete',
        method: 'DELETE',
        path: '/users/:id',
        operation: 'users.delete',
      });

      const resolver = new HttpRouteResolver(registry);

      // GET matches
      const matchGet = resolver.resolve('GET', '/users/100');
      assert.strictEqual(matchGet?.routeId, 'users.get');

      // POST does not match (method not allowed)
      const matchPost = resolver.resolve('POST', '/users/100');
      assert.strictEqual(matchPost, undefined);

      // findAllowedMethodsForPath identifies ['GET', 'DELETE']
      const allowed = resolver.findAllowedMethodsForPath('/users/100');
      assert.strictEqual(allowed.length, 2);
      assert.ok(allowed.includes('GET'));
      assert.ok(allowed.includes('DELETE'));

      // Unknown path returns empty allowed methods
      const allowedUnknown = resolver.findAllowedMethodsForPath('/unknown/path/here');
      assert.strictEqual(allowedUnknown.length, 0);
    },
  );

  // =========================================================================
  // 10. ARCHITECTURAL BOUNDARY
  // =========================================================================
  await t.test('10. Architectural boundary: Zero forbidden dependencies in routing modules', () => {
    const pkgJsonPath = path.resolve(__dirname, '../../package.json');
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

    const deps = Object.keys(pkgJson.dependencies || {});
    const forbidden = [
      'express',
      'fastify',
      'koa',
      'hapi',
      'path-to-regexp',
      'regexparam',
      'radix3',
      'find-my-way',
      'ws',
      'socket.io',
      'redis',
      'rabbitmq',
      'kafka',
    ];

    for (const f of forbidden) {
      assert.strictEqual(
        deps.includes(f),
        false,
        `Forbidden dependency detected in @coreforge/http: ${f}`,
      );
    }
  });
});
