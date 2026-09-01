import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { test } from 'node:test';

import type { HttpErrorMapper, HttpErrorMappingResult } from '@coreforge/contracts';
import { TransportResponseFactory } from '@coreforge/transport';

import {
  CoreForgeError,
  DefaultHttpErrorMapper,
  HttpError,
  HttpErrorMapperDuplicateError,
  HttpErrorMapperNotFoundError,
  HttpErrorMapperRegistrationError,
  HttpErrorMapperRegistry,
  HttpErrorMapperResolver,
  HttpErrorMappingConfigurationError,
  HttpErrorMappingDiagnostics,
  HttpErrorMappingEngine,
  HttpErrorMappingError,
  HttpErrorMappingExecutionError,
  HttpErrorMappingValidationError,
  HttpErrorMappingValidator,
  HttpErrorSanitizer,
  HttpJsonSerializer,
  HttpPublicErrorSnapshot,
  HttpResponseMapper,
  HttpRouter,
  HttpSerializationEngine,
  HttpSerializerRegistry,
  HttpSerializerResolver,
  HttpTransportBuilder,
  TransportError,
} from '../src/index';

test('CoreForge HTTP Error Mapping Engine (@coreforge/http)', async (t) => {
  // ─── 1. Error Hierarchy & Codes ─────────────────────────────────────────────

  await t.test(
    '1. Error Hierarchy: all mapping errors inherit correctly with CF-HTTP-ERROR-MAPPING codes',
    () => {
      const base = new HttpErrorMappingError('Base error');
      assert.ok(base instanceof HttpError);
      assert.ok(base instanceof TransportError);
      assert.ok(base instanceof CoreForgeError);
      assert.strictEqual(base.code, 'CF-HTTP-ERROR-MAPPING');

      const config = new HttpErrorMappingConfigurationError('Config error');
      assert.ok(config instanceof HttpErrorMappingError);
      assert.strictEqual(config.code, 'CF-HTTP-ERROR-MAPPING-CONFIG');

      const reg = new HttpErrorMapperRegistrationError('Registration error');
      assert.ok(reg instanceof HttpErrorMappingError);
      assert.strictEqual(reg.code, 'CF-HTTP-ERROR-MAPPING-REGISTRATION');

      const dup = new HttpErrorMapperDuplicateError('dup-mapper');
      assert.ok(dup instanceof HttpErrorMappingError);
      assert.strictEqual(dup.code, 'CF-HTTP-ERROR-MAPPING-DUPLICATE');
      assert.strictEqual(dup.mapperId, 'dup-mapper');

      const notFound = new HttpErrorMapperNotFoundError('missing-target');
      assert.ok(notFound instanceof HttpErrorMappingError);
      assert.strictEqual(notFound.code, 'CF-HTTP-ERROR-MAPPING-NOT-FOUND');
      assert.strictEqual(notFound.target, 'missing-target');

      const exec = new HttpErrorMappingExecutionError('Execution error');
      assert.ok(exec instanceof HttpErrorMappingError);
      assert.strictEqual(exec.code, 'CF-HTTP-ERROR-MAPPING-EXECUTION');

      const valid = new HttpErrorMappingValidationError('Validation error');
      assert.ok(valid instanceof HttpErrorMappingError);
      assert.strictEqual(valid.code, 'CF-HTTP-ERROR-MAPPING-VALIDATION');
    },
  );

  // ─── 2. HttpErrorMappingValidator ───────────────────────────────────────────

  await t.test('2a. HttpErrorMappingValidator: validates HTTP status codes', () => {
    // Valid status codes
    assert.doesNotThrow(() => HttpErrorMappingValidator.validateStatus(200));
    assert.doesNotThrow(() => HttpErrorMappingValidator.validateStatus(400));
    assert.doesNotThrow(() => HttpErrorMappingValidator.validateStatus(404));
    assert.doesNotThrow(() => HttpErrorMappingValidator.validateStatus(500));
    assert.doesNotThrow(() => HttpErrorMappingValidator.validateStatus(599));

    // Invalid status codes
    assert.throws(
      () => HttpErrorMappingValidator.validateStatus(99),
      HttpErrorMappingValidationError,
    );
    assert.throws(
      () => HttpErrorMappingValidator.validateStatus(600),
      HttpErrorMappingValidationError,
    );
    assert.throws(
      () => HttpErrorMappingValidator.validateStatus(200.5),
      HttpErrorMappingValidationError,
    );
    assert.throws(
      () => HttpErrorMappingValidator.validateStatus(NaN),
      HttpErrorMappingValidationError,
    );
  });

  await t.test('2b. HttpErrorMappingValidator: validates HttpPublicError structure', () => {
    // Valid
    assert.doesNotThrow(() =>
      HttpErrorMappingValidator.validatePublicError({
        code: 'VALID_CODE',
        message: 'Valid message',
      }),
    );

    // Missing / invalid code
    assert.throws(
      () => HttpErrorMappingValidator.validatePublicError({ code: '', message: 'msg' }),
      HttpErrorMappingValidationError,
    );
    assert.throws(
      () => HttpErrorMappingValidator.validatePublicError({ code: '   ', message: 'msg' }),
      HttpErrorMappingValidationError,
    );

    // Missing / invalid message
    assert.throws(
      () => HttpErrorMappingValidator.validatePublicError({ code: 'CODE', message: '' }),
      HttpErrorMappingValidationError,
    );
    assert.throws(
      () => HttpErrorMappingValidator.validatePublicError({ code: 'CODE', message: '  ' }),
      HttpErrorMappingValidationError,
    );
  });

  await t.test('2c. HttpErrorMappingValidator: validates HttpErrorMapper contract', () => {
    const validMapper: HttpErrorMapper = {
      id: 'custom-mapper',
      map(_err, _ctx) {
        return {
          status: 400,
          publicError: { code: 'BAD_REQUEST', message: 'Invalid payload' },
        };
      },
    };

    assert.doesNotThrow(() => HttpErrorMappingValidator.validateMapper(validMapper));

    // Invalid ID
    assert.throws(
      () =>
        HttpErrorMappingValidator.validateMapper({
          id: '',
          map: () => ({}) as HttpErrorMappingResult,
        }),
      HttpErrorMappingValidationError,
    );

    // Missing map function
    assert.throws(
      () => HttpErrorMappingValidator.validateMapper({ id: 'bad' } as unknown as HttpErrorMapper),
      HttpErrorMappingValidationError,
    );
  });

  // ─── 3. HttpPublicErrorSnapshot ─────────────────────────────────────────────

  await t.test('3a. HttpPublicErrorSnapshot: creates deeply frozen public error and result', () => {
    const mutableDetails = { field: 'email', reason: 'invalid format' };
    const pubErr = HttpPublicErrorSnapshot.createPublicError(
      'VALIDATION_FAILED',
      'Validation failed on one or more fields',
      mutableDetails,
    );

    assert.strictEqual(pubErr.code, 'VALIDATION_FAILED');
    assert.strictEqual(pubErr.message, 'Validation failed on one or more fields');
    assert.ok(Object.isFrozen(pubErr));
    assert.ok(Object.isFrozen(pubErr.details));

    // Mutation of original details does not affect snapshot
    mutableDetails.field = 'mutated';
    assert.strictEqual((pubErr.details as { field: string }).field, 'email');

    // Create mapping result with mixed-case headers
    const result = HttpPublicErrorSnapshot.createResult(400, pubErr, {
      'Content-Type': 'application/json',
      'X-Error-Reason': 'Validation',
    });

    assert.strictEqual(result.status, 400);
    assert.ok(Object.isFrozen(result));
    assert.ok(Object.isFrozen(result.headers));
    assert.strictEqual(result.headers!['content-type'], 'application/json');
    assert.strictEqual(result.headers!['x-error-reason'], 'Validation');
    assert.strictEqual(result.headers!['Content-Type'], undefined);
  });

  await t.test('3b. HttpPublicErrorSnapshot: circular reference in error details sanitized', () => {
    const circular: Record<string, unknown> = { key: 'value' };
    circular['self'] = circular;

    const pubErr = HttpPublicErrorSnapshot.createPublicError(
      'CIRCULAR_ERROR',
      'Has cycle',
      circular,
    );
    assert.strictEqual((pubErr.details as Record<string, unknown>)['self'], '[Circular]');
  });

  await t.test(
    '3c. HttpPublicErrorSnapshot: creates sanitized, immutable execution context',
    () => {
      const ctx = HttpPublicErrorSnapshot.createContext({
        requestId: 'req-123',
        method: 'post',
        url: '/orders?ref=abc',
        path: '/orders',
        metadata: { tenantId: 'tenant-42' },
      });

      assert.strictEqual(ctx.requestId, 'req-123');
      assert.strictEqual(ctx.method, 'POST');
      assert.strictEqual(ctx.path, '/orders');
      assert.ok(Object.isFrozen(ctx));
      assert.ok(Object.isFrozen(ctx.metadata));
    },
  );

  // ─── 4. HttpErrorMapperRegistry ─────────────────────────────────────────────

  await t.test(
    '4a. HttpErrorMapperRegistry: registers, lists, unregisters, and rejects duplicates',
    () => {
      const registry = new HttpErrorMapperRegistry();

      const dummyMapper: HttpErrorMapper = {
        id: 'mapper-1',
        map: () => ({ status: 400, publicError: { code: 'BAD_REQ', message: 'Bad request' } }),
      };

      registry.register(dummyMapper, { priority: 10, code: 'ERR_1' });
      assert.strictEqual(registry.size, 1);
      assert.ok(registry.has('mapper-1'));
      assert.strictEqual(registry.get('mapper-1')?.priority, 10);
      assert.strictEqual(registry.get('mapper-1')?.code, 'ERR_1');

      // Duplicate registration rejection
      assert.throws(
        () => registry.register(dummyMapper),
        (err) => err instanceof HttpErrorMapperDuplicateError && err.mapperId === 'mapper-1',
      );

      // Unregister
      assert.strictEqual(registry.unregister('mapper-1'), true);
      assert.strictEqual(registry.size, 0);
      assert.strictEqual(registry.has('mapper-1'), false);
      assert.strictEqual(registry.unregister('non-existent'), false);

      // Clear
      registry.register(dummyMapper);
      assert.strictEqual(registry.size, 1);
      registry.clear();
      assert.strictEqual(registry.size, 0);
    },
  );

  await t.test(
    '4b. HttpErrorMapperRegistry: locking prevents registration, unregistration, and clear',
    () => {
      const registry = new HttpErrorMapperRegistry();
      const dummyMapper: HttpErrorMapper = {
        id: 'locked-mapper',
        map: () => ({ status: 500, publicError: { code: 'FAIL', message: 'Fail' } }),
      };
      registry.register(dummyMapper);

      assert.strictEqual(registry.locked, false);
      registry.lock();
      assert.strictEqual(registry.locked, true);

      assert.throws(() => registry.register(dummyMapper), HttpErrorMappingConfigurationError);
      assert.throws(() => registry.unregister('locked-mapper'), HttpErrorMappingConfigurationError);
      assert.throws(() => registry.clear(), HttpErrorMappingConfigurationError);
    },
  );

  // ─── 5. HttpErrorMapperResolver ─────────────────────────────────────────────

  await t.test(
    '5a. HttpErrorMapperResolver: resolves by explicit ID, constructor type, error code, and predicate',
    () => {
      const registry = new HttpErrorMapperRegistry();

      class CustomDomainError extends Error {
        public readonly code = 'CUSTOM_DOMAIN';
        constructor(msg: string) {
          super(msg);
          this.name = 'CustomDomainError';
        }
      }

      const typeMapper: HttpErrorMapper = {
        id: 'type-mapper',
        map: () => ({ status: 422, publicError: { code: 'DOMAIN_ERR', message: 'Domain error' } }),
      };

      const codeMapper: HttpErrorMapper = {
        id: 'code-mapper',
        map: () => ({ status: 409, publicError: { code: 'CODE_MATCH', message: 'Code match' } }),
      };

      const predicateMapper: HttpErrorMapper = {
        id: 'pred-mapper',
        map: () => ({ status: 418, publicError: { code: 'TEAPOT', message: 'Teapot' } }),
      };

      registry.register(typeMapper, { errorType: CustomDomainError });
      registry.register(codeMapper, { code: 'EXPLICIT_CODE_MATCH' });
      registry.register(predicateMapper, {
        predicate: (err: unknown) => typeof (err as { isTeapot?: boolean })?.isTeapot === 'boolean',
      });

      const resolver = new HttpErrorMapperResolver(registry);

      // 1. Explicit ID
      assert.strictEqual(
        resolver.resolve(new Error('any'), { mapperId: 'code-mapper' }),
        codeMapper,
      );

      // 2. Type / constructor match
      const domainErr = new CustomDomainError('Entity missing');
      assert.strictEqual(resolver.resolve(domainErr), typeMapper);

      // 3. Error code match
      const codeErr = { code: 'EXPLICIT_CODE_MATCH', message: 'some msg' };
      assert.strictEqual(resolver.resolve(codeErr), codeMapper);

      // 4. Predicate match
      const teapotErr = { isTeapot: true, message: 'I am a teapot' };
      assert.strictEqual(resolver.resolve(teapotErr), predicateMapper);
    },
  );

  await t.test(
    '5b. HttpErrorMapperResolver: deterministic precedence: Priority DESC -> Sequence ASC',
    () => {
      const registry = new HttpErrorMapperRegistry();

      const lowPriorityMapper: HttpErrorMapper = {
        id: 'low-prio',
        map: () => ({ status: 400, publicError: { code: 'LOW', message: 'Low' } }),
      };

      const highPriorityMapper: HttpErrorMapper = {
        id: 'high-prio',
        map: () => ({ status: 400, publicError: { code: 'HIGH', message: 'High' } }),
      };

      // Both match code 'TIED_CODE', but highPriorityMapper has priority 100
      registry.register(lowPriorityMapper, { code: 'TIED_CODE', priority: 10 });
      registry.register(highPriorityMapper, { code: 'TIED_CODE', priority: 100 });

      const resolver = new HttpErrorMapperResolver(registry);
      assert.strictEqual(resolver.resolve({ code: 'TIED_CODE' }), highPriorityMapper);

      // Tied priority -> registration sequence ASC (first registered wins)
      const registryTied = new HttpErrorMapperRegistry();
      const firstMapper: HttpErrorMapper = {
        id: 'first',
        map: () => ({ status: 400, publicError: { code: 'FIRST', message: 'First' } }),
      };
      const secondMapper: HttpErrorMapper = {
        id: 'second',
        map: () => ({ status: 400, publicError: { code: 'SECOND', message: 'Second' } }),
      };

      registryTied.register(firstMapper, { code: 'SAME_CODE', priority: 50 });
      registryTied.register(secondMapper, { code: 'SAME_CODE', priority: 50 });

      const resolverTied = new HttpErrorMapperResolver(registryTied);
      assert.strictEqual(resolverTied.resolve({ code: 'SAME_CODE' }), firstMapper);
    },
  );

  await t.test('5c. HttpErrorMapperResolver: fallback mapper and throwOnNotFound handling', () => {
    const fallbackMapper: HttpErrorMapper = {
      id: 'fallback',
      map: () => ({ status: 500, publicError: { code: 'FALLBACK', message: 'Fallback' } }),
    };

    const emptyRegistry = new HttpErrorMapperRegistry();
    const resolverWithFallback = new HttpErrorMapperResolver(emptyRegistry, fallbackMapper);

    assert.strictEqual(
      resolverWithFallback.resolve(new Error('random unmapped error')),
      fallbackMapper,
    );

    const resolverNoFallback = new HttpErrorMapperResolver(emptyRegistry);
    assert.strictEqual(resolverNoFallback.resolve(new Error('unmapped')), undefined);

    assert.throws(
      () => resolverNoFallback.resolve(new Error('unmapped'), { throwOnNotFound: true }),
      HttpErrorMapperNotFoundError,
    );
  });

  // ─── 6. HttpErrorSanitizer ──────────────────────────────────────────────────

  await t.test(
    '6a. HttpErrorSanitizer: redacts credentials, secrets, tokens, connection strings, and paths',
    () => {
      const raw =
        'Failed with bearer secret-token-123 and password=SuperSecret! and token=jwt.payload.sig and apikey=key-999';
      const sanitized = HttpErrorSanitizer.sanitizeString(raw);

      assert.ok(!sanitized.includes('secret-token-123'));
      assert.ok(!sanitized.includes('SuperSecret!'));
      assert.ok(!sanitized.includes('jwt.payload.sig'));
      assert.ok(!sanitized.includes('key-999'));
      assert.ok(sanitized.includes('[REDACTED]'));

      // Connection strings
      const connStr =
        'Error: could not connect to mongodb://admin:secret123@mongo.internal:27017/coreforge_db?ssl=true';
      const sanitizedConn = HttpErrorSanitizer.sanitizeString(connStr);
      assert.ok(!sanitizedConn.includes('admin:secret123'));
      assert.ok(!sanitizedConn.includes('mongo.internal'));
      assert.ok(sanitizedConn.includes('mongodb://[REDACTED]'));

      const pgStr = 'Postgres error postgres://postgres:password456@pg.prod:5432/main';
      const sanitizedPg = HttpErrorSanitizer.sanitizeString(pgStr);
      assert.ok(!sanitizedPg.includes('password456'));
      assert.ok(sanitizedPg.includes('postgres://[REDACTED]'));

      // File paths
      const pathStr =
        'Exception in /home/deploy/app/server.ts at C:\\Users\\Admin\\project\\index.ts';
      const sanitizedPath = HttpErrorSanitizer.sanitizeString(pathStr);
      assert.ok(!sanitizedPath.includes('/home/deploy/app'));
      assert.ok(!sanitizedPath.includes('C:\\Users\\Admin'));
      assert.ok(sanitizedPath.includes('[PATH_REDACTED]'));

      // Object details redaction
      const sensitiveDetails = {
        user: 'alice',
        password: 'mypassword',
        token: 'jwt.tok',
        headers: { authorization: 'Bearer topsecret', 'content-type': 'application/json' },
        customSecret: 'hidden',
      };
      const sanitizedDetails = HttpErrorSanitizer.sanitizeDetails(sensitiveDetails, [
        'customSecret',
      ]) as Record<string, unknown>;

      assert.strictEqual(sanitizedDetails['user'], 'alice');
      assert.strictEqual(sanitizedDetails['password'], '[REDACTED]');
      assert.strictEqual(sanitizedDetails['token'], '[REDACTED]');
      assert.strictEqual(
        (sanitizedDetails['headers'] as Record<string, unknown>)['authorization'],
        '[REDACTED]',
      );
      assert.strictEqual(
        (sanitizedDetails['headers'] as Record<string, unknown>)['content-type'],
        'application/json',
      );
      assert.strictEqual(sanitizedDetails['customSecret'], '[REDACTED]');
    },
  );

  // ─── 7. DefaultHttpErrorMapper ──────────────────────────────────────────────

  await t.test('7a. DefaultHttpErrorMapper: standard CoreForge error status mappings', () => {
    const mapper = new DefaultHttpErrorMapper();
    const ctx = HttpPublicErrorSnapshot.createContext();

    // 400 Validation
    const valRes = mapper.map(new CoreForgeError('Invalid', 'VALIDATION_FAILED'), ctx);
    assert.strictEqual(valRes.status, 400);
    assert.strictEqual(valRes.publicError.code, 'VALIDATION_FAILED');

    // 401 Authentication
    const authRes = mapper.map(
      new CoreForgeError('Unauthenticated', 'AUTHENTICATION_REQUIRED'),
      ctx,
    );
    assert.strictEqual(authRes.status, 401);

    // 403 Forbidden
    const forbRes = mapper.map(new CoreForgeError('Forbidden', 'FORBIDDEN_RESOURCE'), ctx);
    assert.strictEqual(forbRes.status, 403);

    // 404 Not Found
    const nfRes = mapper.map(new CoreForgeError('Not found', 'RESOURCE_NOT_FOUND'), ctx);
    assert.strictEqual(nfRes.status, 404);

    // 405 Method Not Allowed
    const mnaRes = mapper.map(new CoreForgeError('Method not allowed', 'METHOD_NOT_ALLOWED'), ctx);
    assert.strictEqual(mnaRes.status, 405);

    // 409 Conflict
    const confRes = mapper.map(new CoreForgeError('Conflict', 'RESOURCE_CONFLICT'), ctx);
    assert.strictEqual(confRes.status, 409);

    // 429 Rate Limit
    const rlRes = mapper.map(new CoreForgeError('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED'), ctx);
    assert.strictEqual(rlRes.status, 429);

    // 504 Timeout
    const toRes = mapper.map(new CoreForgeError('Timed out', 'GATEWAY_TIMEOUT'), ctx);
    assert.strictEqual(toRes.status, 504);

    // 499 Cancellation
    const cancelRes = mapper.map(new CoreForgeError('Cancelled', 'OPERATION_CANCELLED'), ctx);
    assert.strictEqual(cancelRes.status, 499);

    // 503 State
    const stateRes = mapper.map(new CoreForgeError('Unavailable', 'SERVICE_STATE_STOPPED'), ctx);
    assert.strictEqual(stateRes.status, 503);
  });

  await t.test(
    '7b. DefaultHttpErrorMapper: unknown error completely sanitizes stack, internal message and database URLs',
    () => {
      const mapper = new DefaultHttpErrorMapper();
      const ctx = HttpPublicErrorSnapshot.createContext();

      const rawError = new Error(
        'Mongo connection failed at mongodb://admin:pass123@mongo.prod:27017/secret_db',
      );
      rawError.stack =
        'Error: Mongo connection failed\n    at Object.<anonymous> (/home/deploy/app/db.ts:42:15)';

      const res = mapper.map(rawError, ctx);
      assert.strictEqual(res.status, 500);
      assert.strictEqual(res.publicError.code, 'INTERNAL_ERROR');
      assert.strictEqual(res.publicError.message, 'An internal server error occurred.');
      assert.strictEqual(res.publicError.details, undefined);

      // Verify none of the internal details leaked
      const serialized = JSON.stringify(res);
      assert.ok(!serialized.includes('pass123'));
      assert.ok(!serialized.includes('mongo.prod'));
      assert.ok(!serialized.includes('secret_db'));
      assert.ok(!serialized.includes('/home/deploy/app'));
      assert.ok(!serialized.includes('db.ts'));
    },
  );

  // ─── 8. HttpErrorMappingEngine ──────────────────────────────────────────────

  await t.test(
    '8a. HttpErrorMappingEngine: executes mapping, tracks diagnostics, and provides safe fallback',
    async () => {
      const engine = new HttpErrorMappingEngine();

      // Custom mapper
      const customMapper: HttpErrorMapper = {
        id: 'payment-error-mapper',
        map: () => ({
          status: 402,
          publicError: { code: 'PAYMENT_REQUIRED', message: 'Insufficient funds' },
        }),
      };
      engine.registerMapper(customMapper, { code: 'INSUFFICIENT_FUNDS' });

      // Map registered error
      const res1 = await engine.mapError({
        code: 'INSUFFICIENT_FUNDS',
        message: 'Not enough money',
      });
      assert.strictEqual(res1.status, 402);
      assert.strictEqual(res1.publicError.code, 'PAYMENT_REQUIRED');

      // Map unmapped error -> triggers fallback
      const res2 = await engine.mapError(new Error('Unknown internal failure'));
      assert.strictEqual(res2.status, 500);
      assert.strictEqual(res2.publicError.code, 'INTERNAL_ERROR');

      // Verify diagnostics
      const snap = engine.diagnostics.getSnapshot();
      assert.strictEqual(snap.totalErrorsMapped, 2);
      assert.strictEqual(snap.successfulMappings, 1);
      assert.strictEqual(snap.fallbackMappings, 1);
      assert.strictEqual(snap.statusDistribution[402], 1);
      assert.strictEqual(snap.statusDistribution[500], 1);
      assert.strictEqual(typeof snap.averageDurationMs, 'number');
    },
  );

  await t.test(
    '8b. HttpErrorMappingEngine: throwing mapper safely falls back to 500 without crashing',
    async () => {
      const engine = new HttpErrorMappingEngine();

      const buggyMapper: HttpErrorMapper = {
        id: 'buggy-mapper',
        map: () => {
          throw new Error('Mapper exploded unexpectedly!');
        },
      };
      engine.registerMapper(buggyMapper, { code: 'TRIGGER_BUGGY' });

      const res = await engine.mapError({ code: 'TRIGGER_BUGGY' });
      assert.strictEqual(res.status, 500);
      assert.strictEqual(res.publicError.code, 'INTERNAL_ERROR');
      assert.strictEqual(res.publicError.message, 'An internal server error occurred.');

      const snap = engine.diagnostics.getSnapshot();
      assert.strictEqual(snap.mappingFailures, 1);
    },
  );

  await t.test(
    '8c. HttpErrorMappingDiagnostics: tracks pure numerical metrics and reset works',
    () => {
      const diag = new HttpErrorMappingDiagnostics();
      diag.recordSuccess(200, 5);
      diag.recordFallback(500, 10);
      diag.recordFailure(15);
      diag.recordResolutionFailure();

      const snapshot = diag.getSnapshot();
      assert.strictEqual(snapshot.totalErrorsMapped, 3);
      assert.strictEqual(snapshot.successfulMappings, 1);
      assert.strictEqual(snapshot.fallbackMappings, 1);
      assert.strictEqual(snapshot.mappingFailures, 1);
      assert.strictEqual(snapshot.resolutionFailures, 1);
      assert.strictEqual(snapshot.statusDistribution[200], 1);
      assert.strictEqual(snapshot.statusDistribution[500], 1);
      assert.ok(snapshot.averageDurationMs > 0);
      assert.strictEqual(snapshot.slowestDurationMs, 15);

      diag.reset();
      const resetSnap = diag.getSnapshot();
      assert.strictEqual(resetSnap.totalErrorsMapped, 0);
      assert.strictEqual(resetSnap.successfulMappings, 0);
      assert.strictEqual(resetSnap.fallbackMappings, 0);
      assert.strictEqual(resetSnap.mappingFailures, 0);
      assert.strictEqual(resetSnap.resolutionFailures, 0);
      assert.strictEqual(Object.keys(resetSnap.statusDistribution).length, 0);
    },
  );

  // ─── 9. Execution Pipeline & Phase 8.7 Serialization Integration ───────────

  await t.test(
    '9a. HttpResponseMapper: serializes error response body via HttpSerializationEngine',
    async () => {
      const serRegistry = new HttpSerializerRegistry();
      serRegistry.register(new HttpJsonSerializer());
      const serResolver = new HttpSerializerResolver(serRegistry);
      const serializationEngine = new HttpSerializationEngine(serResolver);

      const transportFailure = TransportResponseFactory.createFailure(
        new CoreForgeError('Invalid email format', 'VALIDATION_FAILED', { field: 'email' }),
      );

      const httpRes = await HttpResponseMapper.toHttpResponseAsync(
        transportFailure,
        { includeErrorDetails: true },
        { mediaType: 'application/json' },
        serializationEngine,
      );

      assert.strictEqual(httpRes.status, 400);
      assert.strictEqual(httpRes.headers['content-type'], 'application/json');
      assert.strictEqual(typeof httpRes.body, 'string');

      const parsed = JSON.parse(httpRes.body as unknown as string);
      assert.strictEqual(parsed.error.code, 'VALIDATION_FAILED');
      assert.strictEqual(parsed.error.message, 'Invalid email format');
      assert.strictEqual(parsed.error.details.field, 'email');
    },
  );

  await t.test(
    '9b. HttpResponseMapper: custom error mapper result is serialized via HttpSerializationEngine',
    async () => {
      const serRegistry = new HttpSerializerRegistry();
      serRegistry.register(new HttpJsonSerializer());
      const serResolver = new HttpSerializerResolver(serRegistry);
      const serializationEngine = new HttpSerializationEngine(serResolver);

      const errorEngine = new HttpErrorMappingEngine();
      const customMapper: HttpErrorMapper = {
        id: 'unprocessable-entity-mapper',
        map: () => ({
          status: 422,
          publicError: { code: 'UNPROCESSABLE_ENTITY', message: 'Semantic validation error' },
        }),
      };
      errorEngine.registerMapper(customMapper, { code: 'SEMANTIC_ERROR' });

      const transportFailure = TransportResponseFactory.createFailure(
        new CoreForgeError('Semantic error', 'SEMANTIC_ERROR'),
      );

      const httpRes = await HttpResponseMapper.toHttpResponseAsync(
        transportFailure,
        {},
        { mediaType: 'application/json' },
        serializationEngine,
        errorEngine,
      );

      assert.strictEqual(httpRes.status, 422);
      assert.strictEqual(typeof httpRes.body, 'string');
      const parsed = JSON.parse(httpRes.body as unknown as string);
      assert.strictEqual(parsed.error.code, 'UNPROCESSABLE_ENTITY');
      assert.strictEqual(parsed.error.message, 'Semantic validation error');
    },
  );

  await t.test('9c. Middleware reverse unwinding during error propagation', async () => {
    const events: string[] = [];

    const router = new HttpRouter();
    router.use({
      id: 'mw-outer',
      name: 'OuterMiddleware',
      async execute(_ctx, next) {
        events.push('enter outer');
        try {
          return await next();
        } finally {
          events.push('unwind outer');
        }
      },
    });
    router.use({
      id: 'mw-inner',
      name: 'InnerMiddleware',
      async execute(_ctx, next) {
        events.push('enter inner');
        try {
          return await next();
        } finally {
          events.push('unwind inner');
        }
      },
    });
    router.route({
      id: 'fail-route',
      path: '/fail',
      method: 'GET',
      operation: 'fail.op',
    });
    router.registerController({
      id: 'error.controller',
      name: 'ErrorController',
      execute: () => {
        events.push('controller throws');
        throw new CoreForgeError('Access denied', 'FORBIDDEN_RESOURCE');
      },
    });
    router.registerEndpoint({
      id: 'fail.endpoint',
      name: 'FailEndpoint',
      routeId: 'fail-route',
      operation: 'fail.op',
      controllerId: 'error.controller',
      metadata: {},
      enabled: true,
      priority: 0,
    });

    const manager = HttpTransportBuilder.create().withRouter(router).build();
    await manager.start();

    const response = await manager.handleRoutedRequest({
      method: 'GET',
      url: '/fail',
      path: '/fail',
      headers: {},
    });

    assert.strictEqual(response.status, 403);
    assert.deepStrictEqual(events, [
      'enter outer',
      'enter inner',
      'controller throws',
      'unwind inner',
      'unwind outer',
    ]);

    await manager.stop();
  });

  await t.test(
    '9d. HttpTransportBuilder: registers custom error mapper and locks registry',
    async () => {
      const customMapper: HttpErrorMapper = {
        id: 'custom-teapot-mapper',
        map: () => ({
          status: 418,
          publicError: { code: 'I_AM_A_TEAPOT', message: 'Short and stout' },
        }),
      };

      const router = new HttpRouter();
      router.route({
        id: 'brew-route',
        path: '/brew',
        method: 'POST',
        operation: 'brew.op',
      });
      router.registerController({
        id: 'coffee.controller',
        name: 'CoffeeController',
        execute: () => {
          throw new CoreForgeError('Cannot brew coffee', 'BREW_COFFEE_FAILED');
        },
      });
      router.registerEndpoint({
        id: 'brew.endpoint',
        name: 'BrewEndpoint',
        routeId: 'brew-route',
        operation: 'brew.op',
        controllerId: 'coffee.controller',
        metadata: {},
        enabled: true,
        priority: 0,
      });

      const manager = HttpTransportBuilder.create()
        .withRouter(router)
        .withErrorMapper(customMapper, { code: 'BREW_COFFEE_FAILED' })
        .build();

      await manager.start();

      assert.ok(manager.errorMappingEngine?.registry.locked);

      const response = await manager.handleRoutedRequest({
        method: 'POST',
        url: '/brew',
        path: '/brew',
        headers: {},
      });

      assert.strictEqual(response.status, 418);
      const parsed = typeof response.body === 'string' ? JSON.parse(response.body) : response.body;
      assert.strictEqual((parsed as { error: { code: string } }).error.code, 'I_AM_A_TEAPOT');

      await manager.stop();
    },
  );

  // ─── 10. High Concurrency: 1,000 Concurrent Error Mappings ────────────────

  await t.test(
    '10. High-Concurrency: 1,000 concurrent error requests maintain strict isolation with zero cross-talk',
    async () => {
      const engine = new HttpErrorMappingEngine(undefined, { includeErrorDetails: true });

      const testErrors = [
        {
          err: new CoreForgeError('Invalid email', 'VALIDATION_FAILED', { field: 'email' }),
          expectedStatus: 400,
          expectedCode: 'VALIDATION_FAILED',
        },
        {
          err: new CoreForgeError('Unauthorized token', 'UNAUTHORIZED_ACCESS'),
          expectedStatus: 401,
          expectedCode: 'UNAUTHORIZED_ACCESS',
        },
        {
          err: new CoreForgeError('Forbidden zone', 'FORBIDDEN_ZONE'),
          expectedStatus: 403,
          expectedCode: 'FORBIDDEN_ZONE',
        },
        {
          err: new CoreForgeError('Conflict item', 'CONFLICT_RECORD'),
          expectedStatus: 409,
          expectedCode: 'CONFLICT_RECORD',
        },
        {
          err: new CoreForgeError('Cancelled operation', 'OPERATION_CANCELLED'),
          expectedStatus: 499,
          expectedCode: 'OPERATION_CANCELLED',
        },
      ];

      const CONCURRENCY = 1000;
      const tasks = Array.from({ length: CONCURRENCY }, async (_, i) => {
        const item = testErrors[i % testErrors.length];
        const ctx = HttpPublicErrorSnapshot.createContext({
          requestId: `req-${i}`,
          method: 'POST',
          url: `/resource/${i}`,
        });

        const result = await engine.mapError(item.err, ctx);

        assert.strictEqual(result.status, item.expectedStatus);
        assert.strictEqual(result.publicError.code, item.expectedCode);
        return result;
      });

      const results = await Promise.all(tasks);
      assert.strictEqual(results.length, CONCURRENCY);

      const snapshot = engine.diagnostics.getSnapshot();
      assert.strictEqual(snapshot.totalErrorsMapped, CONCURRENCY);
      assert.strictEqual(snapshot.fallbackMappings, CONCURRENCY);
      assert.strictEqual(snapshot.mappingFailures, 0);
      assert.strictEqual(snapshot.statusDistribution[400], 200);
      assert.strictEqual(snapshot.statusDistribution[401], 200);
      assert.strictEqual(snapshot.statusDistribution[403], 200);
      assert.strictEqual(snapshot.statusDistribution[409], 200);
      assert.strictEqual(snapshot.statusDistribution[499], 200);
    },
  );

  // ─── 11. Security & Redaction Boundary ────────────────────────────────────

  await t.test(
    '11. Security & Redaction Boundary: deep credential sanitization and numerical diagnostics',
    async () => {
      const sanitizer = HttpErrorSanitizer;

      const sensitiveText =
        'Failed connecting to postgres://user:secret123@db.prod.internal:5432/main with Bearer eyJhbGciOi.secret.token at C:\\Users\\Administrator\\keys\\cert.pem';
      const sanitized = sanitizer.sanitizeString(sensitiveText);

      assert.strictEqual(sanitized.includes('secret123'), false);
      assert.strictEqual(sanitized.includes('eyJhbGciOi'), false);
      assert.strictEqual(sanitized.includes('Administrator'), false);

      const diag = new HttpErrorMappingDiagnostics();
      diag.recordSuccess(400, 1.5);
      diag.recordFallback(500, 2.0);
      diag.recordFailure(3.0);

      const snapshot = diag.getSnapshot();
      for (const [key, value] of Object.entries(snapshot)) {
        if (key === 'statusDistribution') {
          for (const count of Object.values(value)) {
            assert.strictEqual(typeof count, 'number');
          }
        } else {
          assert.strictEqual(typeof value, 'number');
        }
      }
    },
  );

  // ─── 12. Critical Architectural Boundary ──────────────────────────────────

  await t.test(
    '12. Critical Architectural Boundary: @coreforge/http has zero dependency on higher layers',
    () => {
      const packageJsonPath = path.resolve(__dirname, '../../package.json');
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      const dependencies = Object.keys(pkg.dependencies || {});
      const forbiddenPackages = [
        '@coreforge/application',
        '@coreforge/kernel',
        '@coreforge/runtime',
        '@coreforge/controllers',
        '@coreforge/middleware',
        '@coreforge/router',
        '@coreforge/request-handler',
        '@coreforge/binding',
        '@coreforge/request-scope',
      ];

      for (const forbidden of forbiddenPackages) {
        assert.strictEqual(
          dependencies.includes(forbidden),
          false,
          `Illegal dependency detected: @coreforge/http must NOT depend on ${forbidden}`,
        );
      }
    },
  );
});
