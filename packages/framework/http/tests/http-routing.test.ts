import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { test } from 'node:test';

import {
  HttpMethod,
  HttpRoute,
  HttpRouteMatch,
  HttpRouteOptions,
  HttpRouteRegistry,
  HttpRouteResolver,
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

    const dummyRegistry: HttpRouteRegistry = {
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

    const dummyResolver: HttpRouteResolver = {
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
  // 5. ARCHITECTURAL BOUNDARY
  // =========================================================================
  await t.test('5. Architectural boundary: Zero forbidden dependencies in routing modules', () => {
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
