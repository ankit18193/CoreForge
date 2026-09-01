import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { test } from 'node:test';

import type { HttpResponse, HttpSerializer } from '@coreforge/contracts';
import { ApplicationIntegrationBuilder } from '@coreforge/integration';
import { TransportBuilder, TransportResponseFactory } from '@coreforge/transport';

import {
  DefaultHttpResponseTransformer,
  HttpDiagnostics,
  HttpError,
  HttpExecutionCoordinator,
  HttpJsonSerializer,
  HttpLifecycleManager,
  HttpResponseMapper,
  HttpResponseSnapshot,
  HttpResponseTransformationError,
  HttpResponseValidator,
  HttpRouter,
  HttpSerializationCancellationError,
  HttpSerializationConfigurationError,
  HttpSerializationDiagnostics,
  HttpSerializationEngine,
  HttpSerializationError,
  HttpSerializationExecutionError,
  HttpSerializationProfiler,
  HttpSerializationTimeoutError,
  HttpSerializerDuplicateError,
  HttpSerializerNotFoundError,
  HttpSerializerRegistrationError,
  HttpSerializerRegistry,
  HttpSerializerResolver,
  HttpSerializerValidationError,
  HttpTransportBuilder,
} from '../src/index';

test('CoreForge HTTP Response & Serialization Engine (@coreforge/http)', async (t) => {
  // ─── 1. Error Hierarchy & Codes ─────────────────────────────────────────────

  await t.test(
    '1. Error Hierarchy: all serialization errors inherit correctly with CF-HTTP codes',
    () => {
      const base = new HttpSerializationError('base');
      assert.ok(base instanceof HttpError);
      assert.ok(base instanceof HttpSerializationError);
      assert.strictEqual(base.name, 'HttpSerializationError');
      assert.strictEqual(base.code, 'CF-HTTP-SERIALIZATION');

      const configErr = new HttpSerializationConfigurationError('config error');
      assert.ok(configErr instanceof HttpSerializationError);
      assert.strictEqual(configErr.code, 'CF-HTTP-SERIALIZATION-CONFIG');

      const valErr = new HttpSerializerValidationError('validation error');
      assert.ok(valErr instanceof HttpSerializationError);
      assert.strictEqual(valErr.code, 'CF-HTTP-SERIALIZER-VALIDATION');

      const regErr = new HttpSerializerRegistrationError('registration error');
      assert.ok(regErr instanceof HttpSerializationError);
      assert.strictEqual(regErr.code, 'CF-HTTP-SERIALIZER-REGISTRATION');

      const dupErr = new HttpSerializerDuplicateError('json-serializer');
      assert.ok(dupErr instanceof HttpSerializationError);
      assert.strictEqual(dupErr.code, 'CF-HTTP-SERIALIZER-DUPLICATE');
      assert.strictEqual(dupErr.serializerId, 'json-serializer');

      const notFoundErr = new HttpSerializerNotFoundError('application/xml');
      assert.ok(notFoundErr instanceof HttpSerializationError);
      assert.strictEqual(notFoundErr.code, 'CF-HTTP-SERIALIZER-NOT-FOUND');
      assert.strictEqual(notFoundErr.identifier, 'application/xml');

      const execErr = new HttpSerializationExecutionError('failed to serialize', 'json');
      assert.ok(execErr instanceof HttpSerializationError);
      assert.strictEqual(execErr.code, 'CF-HTTP-SERIALIZATION-EXECUTION');
      assert.strictEqual(execErr.serializerId, 'json');

      const timeoutErr = new HttpSerializationTimeoutError(5000, 'xml');
      assert.ok(timeoutErr instanceof HttpSerializationError);
      assert.strictEqual(timeoutErr.code, 'CF-HTTP-SERIALIZATION-TIMEOUT');
      assert.strictEqual(timeoutErr.timeoutMs, 5000);
      assert.strictEqual(timeoutErr.serializerId, 'xml');

      const cancelErr = new HttpSerializationCancellationError();
      assert.ok(cancelErr instanceof HttpSerializationError);
      assert.strictEqual(cancelErr.code, 'CF-HTTP-SERIALIZATION-CANCELLED');

      const transErr = new HttpResponseTransformationError('transform error', 'dtomapper');
      assert.ok(transErr instanceof HttpSerializationError);
      assert.strictEqual(transErr.code, 'CF-HTTP-RESPONSE-TRANSFORMATION');
      assert.strictEqual(transErr.transformerId, 'dtomapper');
    },
  );

  // ─── 2. HttpResponseValidator ───────────────────────────────────────────────

  await t.test('2a. HttpResponseValidator: validates valid HttpResponse structures', () => {
    const validResponse: HttpResponse = {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'x-request-id': 'req-123',
        'set-cookie': ['a=1', 'b=2'],
      },
      body: { message: 'hello' },
      metadata: { route: 'users.get' },
    };

    const validated = HttpResponseValidator.validateResponse(validResponse);
    assert.strictEqual(validated.status, 200);
  });

  await t.test(
    '2b. HttpResponseValidator: 204 No Content enforcement rejects responses with body',
    () => {
      const invalid204 = {
        status: 204,
        headers: {},
        body: { notAllowed: true },
      };
      assert.throws(
        () => HttpResponseValidator.validateResponse(invalid204),
        HttpSerializerValidationError,
      );

      const valid204 = {
        status: 204,
        headers: {},
        body: undefined,
      };
      assert.doesNotThrow(() => HttpResponseValidator.validateResponse(valid204));
    },
  );

  await t.test('2c. HttpResponseValidator: rejects invalid status and headers', () => {
    assert.throws(
      () => HttpResponseValidator.validateResponse(null),
      HttpSerializerValidationError,
    );
    assert.throws(
      () => HttpResponseValidator.validateResponse({ status: '200' }),
      HttpSerializerValidationError,
    );
    assert.throws(
      () => HttpResponseValidator.validateResponse({ status: 99 }),
      HttpSerializerValidationError,
    );
    assert.throws(
      () => HttpResponseValidator.validateResponse({ status: 600 }),
      HttpSerializerValidationError,
    );
    assert.throws(
      () => HttpResponseValidator.validateResponse({ status: 200, headers: 'invalid' }),
      HttpSerializerValidationError,
    );
    assert.throws(
      () =>
        HttpResponseValidator.validateResponse({
          status: 200,
          headers: { key: 123 as unknown as string },
        }),
      HttpSerializerValidationError,
    );
  });

  await t.test('2d. HttpResponseValidator: validates serializer contracts', () => {
    const validSerializer: HttpSerializer = {
      id: 'json',
      name: 'JSON Serializer',
      mediaTypes: ['application/json'],
      serialize: (val) => JSON.stringify(val),
    };
    assert.doesNotThrow(() => HttpResponseValidator.validateSerializer(validSerializer));

    assert.throws(
      () => HttpResponseValidator.validateSerializer(null),
      HttpSerializerValidationError,
    );
    assert.throws(
      () =>
        HttpResponseValidator.validateSerializer({
          id: '',
          name: 'test',
          mediaTypes: ['a'],
          serialize: () => '',
        }),
      HttpSerializerValidationError,
    );
    assert.throws(
      () =>
        HttpResponseValidator.validateSerializer({
          id: 's',
          name: '',
          mediaTypes: ['a'],
          serialize: () => '',
        }),
      HttpSerializerValidationError,
    );
    assert.throws(
      () =>
        HttpResponseValidator.validateSerializer({
          id: 's',
          name: 's',
          mediaTypes: [],
          serialize: () => '',
        }),
      HttpSerializerValidationError,
    );
    assert.throws(
      () =>
        HttpResponseValidator.validateSerializer({
          id: 's',
          name: 's',
          mediaTypes: ['a'],
          serialize: 'not a fn',
        }),
      HttpSerializerValidationError,
    );
  });

  // ─── 3. HttpResponseSnapshot & Circular Reference Policy ────────────────────

  await t.test(
    '3a. HttpResponseSnapshot: creates immutable deep-frozen response with lowercase headers',
    () => {
      const raw: HttpResponse = {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': 'secret',
        },
        body: { user: { name: 'Alice' } },
        metadata: { trace: 't1' },
      };

      const snapshot = HttpResponseSnapshot.createResponse(raw);
      assert.ok(Object.isFrozen(snapshot));
      assert.ok(Object.isFrozen(snapshot.headers));
      assert.ok(Object.isFrozen(snapshot.body));
      assert.ok(Object.isFrozen((snapshot.body as { user: unknown }).user));

      // Headers must be normalized to lowercase
      assert.strictEqual(snapshot.headers['content-type'], 'application/json');
      assert.strictEqual(snapshot.headers['x-api-key'], 'secret');
      assert.strictEqual(snapshot.headers['Content-Type'], undefined);

      // Mutation throws
      assert.throws(() => {
        (snapshot as unknown as Record<string, unknown>).status = 201;
      });
      assert.throws(() => {
        (snapshot.body as Record<string, unknown>).mutated = true;
      });
    },
  );

  await t.test(
    '3b. HttpResponseSnapshot: circular reference policy ERROR throws HttpSerializationError',
    () => {
      const circular: Record<string, unknown> = { id: 1 };
      circular['self'] = circular;

      assert.throws(
        () => HttpResponseSnapshot.cloneValue(circular, 'ERROR'),
        HttpSerializationError,
      );
    },
  );

  await t.test(
    '3c. HttpResponseSnapshot: circular reference policy SANITIZE safely replaces with [Circular]',
    () => {
      const circular: Record<string, unknown> = { id: 1 };
      circular['self'] = circular;

      const sanitized = HttpResponseSnapshot.cloneValue(circular, 'SANITIZE') as Record<
        string,
        unknown
      >;
      assert.strictEqual(sanitized['id'], 1);
      assert.strictEqual(sanitized['self'], '[Circular]');
    },
  );

  await t.test(
    '3d. HttpResponseSnapshot: creates sanitized, immutable serialization context',
    () => {
      const ctx = HttpResponseSnapshot.createContext('APPLICATION/JSON', {
        charset: 'UTF-8',
        operation: 'users.get',
        status: 200,
        metadata: { tenantId: 'tenant-1' },
      });

      assert.ok(Object.isFrozen(ctx));
      assert.ok(Object.isFrozen(ctx.metadata));
      assert.strictEqual(ctx.mediaType, 'application/json');
      assert.strictEqual(ctx.charset, 'utf-8');
      assert.strictEqual(ctx.operation, 'users.get');
      assert.strictEqual(ctx.status, 200);
    },
  );

  // ─── 4. HttpSerializerRegistry ──────────────────────────────────────────────

  await t.test(
    '4a. HttpSerializerRegistry: registers, retrieves, lists, and unregisters serializers',
    () => {
      const registry = new HttpSerializerRegistry();
      assert.strictEqual(registry.size, 0);
      assert.strictEqual(registry.locked, false);

      const jsonSerializer = new HttpJsonSerializer();
      registry.register(jsonSerializer);

      assert.strictEqual(registry.size, 1);
      assert.strictEqual(registry.has('json'), true);
      assert.strictEqual(registry.get('json'), jsonSerializer);
      assert.strictEqual(registry.list().length, 1);

      // Duplicate registration throws
      assert.throws(() => registry.register(jsonSerializer), HttpSerializerDuplicateError);

      // Unregister
      const removed = registry.unregister('json');
      assert.strictEqual(removed, true);
      assert.strictEqual(registry.size, 0);
      assert.strictEqual(registry.has('json'), false);
      assert.strictEqual(registry.unregister('json'), false);
    },
  );

  await t.test(
    '4b. HttpSerializerRegistry: locking prevents registration, unregistration, and clear',
    () => {
      const registry = new HttpSerializerRegistry();
      const jsonSerializer = new HttpJsonSerializer();
      registry.register(jsonSerializer);

      registry.lock();
      assert.strictEqual(registry.locked, true);

      // Further registration throws
      assert.throws(
        () => registry.register(new HttpJsonSerializer({ id: 'json-2' })),
        HttpSerializationConfigurationError,
      );

      // Unregister throws
      assert.throws(() => registry.unregister('json'), HttpSerializationConfigurationError);

      // Clear throws
      assert.throws(() => registry.clear(), HttpSerializationConfigurationError);
    },
  );

  // ─── 5. HttpJsonSerializer ──────────────────────────────────────────────────

  await t.test(
    '5. HttpJsonSerializer: serializes primitives, objects, arrays, and null correctly',
    () => {
      const serializer = new HttpJsonSerializer();
      assert.strictEqual(serializer.id, 'json');
      assert.deepStrictEqual(serializer.mediaTypes, ['application/json']);

      assert.strictEqual(serializer.serialize({ a: 1, b: 'two' }), '{"a":1,"b":"two"}');
      assert.strictEqual(serializer.serialize([1, 2, 3]), '[1,2,3]');
      assert.strictEqual(serializer.serialize('hello'), '"hello"');
      assert.strictEqual(serializer.serialize(42), '42');
      assert.strictEqual(serializer.serialize(true), 'true');
      assert.strictEqual(serializer.serialize(null), 'null');
      assert.strictEqual(serializer.serialize(undefined), undefined);

      // Circular object serialization throws HttpSerializationExecutionError
      const circular: Record<string, unknown> = {};
      circular['self'] = circular;
      assert.throws(() => serializer.serialize(circular), HttpSerializationExecutionError);
    },
  );

  // ─── 6. HttpSerializerResolver ──────────────────────────────────────────────

  await t.test('6a. HttpSerializerResolver: resolves by explicit serializer ID', () => {
    const registry = new HttpSerializerRegistry();
    const jsonSerializer = new HttpJsonSerializer({ id: 'json-custom' });
    registry.register(jsonSerializer);

    const resolver = new HttpSerializerResolver(registry);
    const resolved = resolver.resolve('json-custom');
    assert.strictEqual(resolved, jsonSerializer);
  });

  await t.test(
    '6b. HttpSerializerResolver: resolves by media type with priority and sequence ordering',
    () => {
      const registry = new HttpSerializerRegistry();

      const lowPriorityJson = new HttpJsonSerializer({ id: 'json-low', priority: 10 });
      const highPriorityJson = new HttpJsonSerializer({ id: 'json-high', priority: 100 });
      const textSerializer: HttpSerializer = {
        id: 'text',
        name: 'TextSerializer',
        priority: 50,
        mediaTypes: ['text/plain'],
        serialize: (val) => String(val),
      };

      // Register low first, then high
      registry.register(lowPriorityJson);
      registry.register(highPriorityJson);
      registry.register(textSerializer);

      const resolver = new HttpSerializerResolver(registry);

      // Media type match: resolves highPriorityJson due to priority 100 > 10
      const matchedJson = resolver.resolve('application/json');
      assert.strictEqual(matchedJson?.id, 'json-high');

      // Media type with charset parameter match
      const matchedWithCharset = resolver.resolve('application/json; charset=utf-8');
      assert.strictEqual(matchedWithCharset?.id, 'json-high');

      // Text match
      const matchedText = resolver.resolve('text/plain');
      assert.strictEqual(matchedText?.id, 'text');

      // Default fallback resolves highest priority overall (json-high: 100)
      const defaultResolved = resolver.resolve();
      assert.strictEqual(defaultResolved?.id, 'json-high');
    },
  );

  await t.test('6c. HttpSerializerResolver: sequence ASC deterministic tie-breaker', () => {
    const registry = new HttpSerializerRegistry();

    const firstEqual = new HttpJsonSerializer({ id: 'first', priority: 50 });
    const secondEqual = new HttpJsonSerializer({ id: 'second', priority: 50 });

    registry.register(firstEqual);
    registry.register(secondEqual);

    const resolver = new HttpSerializerResolver(registry);
    const resolved = resolver.resolve('application/json');
    assert.strictEqual(
      resolved?.id,
      'first',
      'Must resolve first registered serializer on priority tie',
    );
  });

  await t.test('6d. HttpSerializerResolver: throwOnNotFound option throws when no match', () => {
    const registry = new HttpSerializerRegistry();
    const resolver = new HttpSerializerResolver(registry);

    assert.strictEqual(resolver.resolve('application/xml'), undefined);
    assert.throws(
      () => resolver.resolve('application/xml', { throwOnNotFound: true }),
      HttpSerializerNotFoundError,
    );
  });

  // ─── 7. DefaultHttpResponseTransformer ──────────────────────────────────────

  await t.test(
    '7a. DefaultHttpResponseTransformer: leaves data unchanged when no redaction configured',
    () => {
      const transformer = new DefaultHttpResponseTransformer();
      const input = { id: 101, username: 'ankit', email: 'ankit@example.com' };
      const transformed = transformer.transform(input) as Record<string, unknown>;

      assert.deepStrictEqual(transformed, input);
      assert.notStrictEqual(transformed, input, 'Transformer must return a fresh copy');
    },
  );

  await t.test(
    '7b. DefaultHttpResponseTransformer: explicit field redaction masks configured keys',
    () => {
      const transformer = new DefaultHttpResponseTransformer();
      const input = {
        id: 101,
        username: 'ankit',
        password: 'superSecretPassword!',
        nested: {
          token: 'jwt.token.here',
          publicNote: 'hello',
          deep: [{ secretKey: 'topsecret' }],
        },
      };

      const transformed = transformer.transform(input, {
        fieldsToRedact: ['password', 'token', 'secretKey'],
      }) as {
        id: number;
        username: string;
        password: string;
        nested: {
          token: string;
          publicNote: string;
          deep: { secretKey: string }[];
        };
      };

      // Original input must NOT be mutated
      assert.strictEqual(input.password, 'superSecretPassword!');
      assert.strictEqual(input.nested.token, 'jwt.token.here');

      // Transformed copy has redacted fields
      assert.strictEqual(transformed.id, 101);
      assert.strictEqual(transformed.username, 'ankit');
      assert.strictEqual(transformed.password, '[REDACTED]');
      assert.strictEqual(transformed.nested.token, '[REDACTED]');
      assert.strictEqual(transformed.nested.publicNote, 'hello');
      assert.strictEqual(transformed.nested.deep[0].secretKey, '[REDACTED]');
    },
  );

  // ─── 8. HttpSerializationProfiler & HttpSerializationDiagnostics ────────────

  await t.test(
    '8a. HttpSerializationProfiler: measures elapsed execution time in milliseconds',
    async () => {
      const profiler = new HttpSerializationProfiler().start();
      await new Promise((r) => setTimeout(r, 10));
      const elapsed = profiler.stop();
      assert.ok(elapsed >= 8, `Elapsed ms should be at least ~8ms, got ${elapsed}`);
    },
  );

  await t.test(
    '8b. HttpSerializationDiagnostics: records metrics accurately with pure numerical snapshot',
    () => {
      const diag = new HttpSerializationDiagnostics();
      diag.recordSerializationStarted();
      diag.recordSerializationSuccess(15);
      diag.recordSerializationStarted();
      diag.recordSerializationFailure(25, true, false);
      diag.recordTransformationFailure();
      diag.recordResolutionFailure();

      const snap = diag.getSnapshot();
      assert.strictEqual(snap.totalSerializations, 2);
      assert.strictEqual(snap.successfulSerializations, 1);
      assert.strictEqual(snap.failedSerializations, 1);
      assert.strictEqual(snap.cancelledSerializations, 1);
      assert.strictEqual(snap.timeoutSerializations, 0);
      assert.strictEqual(snap.activeSerializations, 0);
      assert.strictEqual(snap.transformationFailures, 1);
      assert.strictEqual(snap.serializerResolutionFailures, 1);
      assert.strictEqual(snap.slowestDurationMs, 25);
      assert.strictEqual(snap.averageDurationMs, 20);

      // Verify snapshot contains only numbers
      for (const [key, val] of Object.entries(snap)) {
        assert.strictEqual(typeof val, 'number', `Metric '${key}' must be a number`);
      }

      diag.reset();
      const resetSnap = diag.getSnapshot();
      assert.strictEqual(resetSnap.totalSerializations, 0);
      assert.strictEqual(resetSnap.successfulSerializations, 0);
    },
  );

  // ─── 9. HttpSerializationEngine ─────────────────────────────────────────────

  await t.test(
    '9a. HttpSerializationEngine: serializes object using default JSON serializer',
    async () => {
      const registry = new HttpSerializerRegistry();
      registry.register(new HttpJsonSerializer());
      const resolver = new HttpSerializerResolver(registry);
      const engine = new HttpSerializationEngine(resolver);

      const result = await engine.serialize({ message: 'CoreForge', code: 200 });
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.serializerId, 'json');
      assert.strictEqual(result.mediaType, 'application/json');
      assert.strictEqual(result.value, '{"message":"CoreForge","code":200}');
      assert.ok(result.durationMs >= 0);
    },
  );

  await t.test(
    '9b. HttpSerializationEngine: 204 No Content skips serialization completely',
    async () => {
      const registry = new HttpSerializerRegistry();
      registry.register(new HttpJsonSerializer());
      const resolver = new HttpSerializerResolver(registry);
      const engine = new HttpSerializationEngine(resolver);

      // Even if a payload is passed, status: 204 must enforce undefined value and skip serializer
      const result = await engine.serialize({ shouldBeIgnored: true }, { status: 204 });
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.value, undefined);
    },
  );

  await t.test(
    '9c. HttpSerializationEngine: undefined value returns undefined value without error',
    async () => {
      const registry = new HttpSerializerRegistry();
      registry.register(new HttpJsonSerializer());
      const resolver = new HttpSerializerResolver(registry);
      const engine = new HttpSerializationEngine(resolver);

      const result = await engine.serialize(undefined);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.value, undefined);
    },
  );

  await t.test('9d. HttpSerializationEngine: handles serializer timeout cleanly', async () => {
    const registry = new HttpSerializerRegistry();
    const slowSerializer: HttpSerializer = {
      id: 'slow',
      name: 'SlowSerializer',
      mediaTypes: ['application/slow'],
      async serialize() {
        await new Promise((r) => setTimeout(r, 100));
        return 'slow';
      },
    };
    registry.register(slowSerializer);
    const resolver = new HttpSerializerResolver(registry);
    const engine = new HttpSerializationEngine(resolver);

    // 20ms timeout on a 100ms serializer
    const result = await engine.serialize(
      { data: 1 },
      {
        serializerId: 'slow',
        timeoutMs: 20,
      },
    );

    assert.strictEqual(result.success, false);
    assert.ok(result.error instanceof HttpSerializationTimeoutError);
    assert.strictEqual((result.error as HttpSerializationTimeoutError).timeoutMs, 20);
    assert.strictEqual(engine.diagnostics.getSnapshot().timeoutSerializations, 1);
  });

  await t.test('9e. HttpSerializationEngine: handles AbortSignal cancellation', async () => {
    const registry = new HttpSerializerRegistry();
    const slowSerializer: HttpSerializer = {
      id: 'slow',
      name: 'SlowSerializer',
      mediaTypes: ['application/slow'],
      async serialize() {
        await new Promise((r) => setTimeout(r, 100));
        return 'slow';
      },
    };
    registry.register(slowSerializer);
    const resolver = new HttpSerializerResolver(registry);
    const engine = new HttpSerializationEngine(resolver);

    const controller = new AbortController();
    setTimeout(() => controller.abort(), 10);

    const result = await engine.serialize(
      { data: 1 },
      {
        serializerId: 'slow',
        signal: controller.signal,
      },
    );

    assert.strictEqual(result.success, false);
    assert.ok(result.error instanceof HttpSerializationCancellationError);
    assert.strictEqual(engine.diagnostics.getSnapshot().cancelledSerializations, 1);
  });

  await t.test(
    '9f. HttpSerializationEngine: missing serializer returns error result or throws',
    async () => {
      const registry = new HttpSerializerRegistry();
      const resolver = new HttpSerializerResolver(registry);
      const engine = new HttpSerializationEngine(resolver);

      const result = await engine.serialize({ data: 1 }, { mediaType: 'application/protobuf' });
      assert.strictEqual(result.success, false);
      assert.ok(result.error instanceof HttpSerializerNotFoundError);

      await assert.rejects(
        () =>
          engine.serialize({ data: 1 }, { mediaType: 'application/protobuf', throwOnError: true }),
        HttpSerializerNotFoundError,
      );
    },
  );

  // ─── 10. HttpResponseMapper & Pipeline Integration ─────────────────────────

  await t.test('10a. HttpResponseMapper: resolveStatus determinism & null body discipline', () => {
    // 1. Default status 200
    const defaultResp = TransportResponseFactory.createSuccess({ name: 'test' });
    assert.strictEqual(HttpResponseMapper.resolveStatus(defaultResp), 200);

    // 2. Explicit status in body
    const bodyStatusResp = TransportResponseFactory.createSuccess({ status: 202, name: 'queued' });
    assert.strictEqual(HttpResponseMapper.resolveStatus(bodyStatusResp), 202);

    // 3. Explicit status in metadata
    const metaStatusResp = TransportResponseFactory.createSuccess(
      { name: 'custom' },
      {
        status: 206,
      },
    );
    assert.strictEqual(HttpResponseMapper.resolveStatus(metaStatusResp), 206);

    // 4. Explicit isCreated flag in metadata
    const createdResp = TransportResponseFactory.createSuccess(
      { id: '101' },
      {
        isCreated: true,
      },
    );
    assert.strictEqual(HttpResponseMapper.resolveStatus(createdResp), 201);

    // 5. Explicit noContent flag in metadata
    const noContentResp = TransportResponseFactory.createSuccess(undefined, {
      noContent: true,
    });
    assert.strictEqual(HttpResponseMapper.resolveStatus(noContentResp), 204);

    // 6. Null body WITHOUT noContent flag must NOT auto-infer 204 — must resolve to 200
    const nullBodyResp = TransportResponseFactory.createSuccess(null);
    assert.strictEqual(
      HttpResponseMapper.resolveStatus(nullBodyResp),
      200,
      'Null body without explicit noContent signal must remain 200',
    );
  });

  await t.test('10b. HttpResponseMapper: normalizeHeaders normalizes keys to lowercase', () => {
    const rawHeaders = {
      'Content-Type': 'application/json',
      'X-Custom-Header': 'val1',
      'Set-Cookie': ['c1=v1', 'c2=v2'],
    };
    const normalized = HttpResponseMapper.normalizeHeaders(rawHeaders);
    assert.strictEqual(normalized['content-type'], 'application/json');
    assert.strictEqual(normalized['x-custom-header'], 'val1');
    assert.deepStrictEqual(normalized['set-cookie'], ['c1=v1', 'c2=v2']);
    assert.strictEqual(normalized['Content-Type'], undefined);
  });

  await t.test('10c. HttpResponseMapper: synchronous toHttpResponse maps success and error', () => {
    const successTransport = TransportResponseFactory.createSuccess({ count: 42 });
    const httpSuccess = HttpResponseMapper.toHttpResponse(successTransport);
    assert.strictEqual(httpSuccess.status, 200);
    assert.strictEqual(httpSuccess.headers['content-type'], 'application/json');
    assert.deepStrictEqual(httpSuccess.body, { count: 42 });

    const failureTransport = TransportResponseFactory.createFailure(new Error('Boom'));
    const httpFailure = HttpResponseMapper.toHttpResponse(failureTransport);
    assert.strictEqual(httpFailure.status, 500);
    assert.strictEqual(httpFailure.headers['content-type'], 'application/json');
  });

  await t.test(
    '10d. HttpResponseMapper: toHttpResponseAsync serializes body with HttpSerializationEngine',
    async () => {
      const registry = new HttpSerializerRegistry();
      registry.register(new HttpJsonSerializer());
      const engine = new HttpSerializationEngine(new HttpSerializerResolver(registry));

      // 1. Success serialization
      const successTransport = TransportResponseFactory.createSuccess({
        user: 'Ankit',
        role: 'admin',
      });
      const httpSuccess = await HttpResponseMapper.toHttpResponseAsync(
        successTransport,
        {},
        {},
        engine,
      );
      assert.strictEqual(httpSuccess.status, 200);
      assert.strictEqual(httpSuccess.headers['content-type'], 'application/json');
      assert.strictEqual(httpSuccess.body, '{"user":"Ankit","role":"admin"}');

      // 2. 204 No Content skips serialization and enforces undefined body
      const noContentTransport = TransportResponseFactory.createSuccess(
        { shouldNotBeSerialized: true },
        { noContent: true },
      );
      const http204 = await HttpResponseMapper.toHttpResponseAsync(
        noContentTransport,
        {},
        {},
        engine,
      );
      assert.strictEqual(http204.status, 204);
      assert.strictEqual(http204.body, undefined);

      // 3. Explicit 201 Created
      const createdTransport = TransportResponseFactory.createSuccess(
        { id: 99 },
        {
          isCreated: true,
        },
      );
      const http201 = await HttpResponseMapper.toHttpResponseAsync(
        createdTransport,
        {},
        {},
        engine,
      );
      assert.strictEqual(http201.status, 201);
      assert.strictEqual(http201.body, '{"id":99}');

      // 4. Null body serializes normally to 'null' with status 200
      const nullTransport = TransportResponseFactory.createSuccess(null);
      const httpNull = await HttpResponseMapper.toHttpResponseAsync(nullTransport, {}, {}, engine);
      assert.strictEqual(httpNull.status, 200);
      assert.strictEqual(httpNull.body, 'null');

      // 5. Redaction during pipeline serialization
      const secretTransport = TransportResponseFactory.createSuccess({
        username: 'ankit',
        password: 'password123',
      });
      const httpRedacted = await HttpResponseMapper.toHttpResponseAsync(
        secretTransport,
        {},
        { fieldsToRedact: ['password'] },
        engine,
      );
      assert.strictEqual(httpRedacted.status, 200);
      assert.strictEqual(httpRedacted.body, '{"username":"ankit","password":"[REDACTED]"}');
    },
  );

  await t.test(
    '10e. HttpExecutionCoordinator: complete end-to-end serialization pipeline integration',
    async () => {
      const app = ApplicationIntegrationBuilder.create().build();
      app.applicationManager.register('items.get', {
        async execute(input: unknown) {
          return { item: 'Widget', input };
        },
      });
      await app.start();

      const tm = TransportBuilder.create().withApplication(app).build();
      await tm.start();

      const lifecycle = new HttpLifecycleManager();
      lifecycle.start();
      const diagnostics = new HttpDiagnostics();

      const registry = new HttpSerializerRegistry();
      registry.register(new HttpJsonSerializer());
      const engine = new HttpSerializationEngine(new HttpSerializerResolver(registry));

      const coordinator = new HttpExecutionCoordinator(
        lifecycle,
        diagnostics,
        tm,
        5000,
        {},
        engine,
      );

      const response = await coordinator.execute({
        method: 'POST',
        url: '/items',
        path: '/items',
        headers: { 'Content-Type': 'application/json' },
        body: { serviceName: 'items.get', input: { id: 123 } },
      });

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.headers['content-type'], 'application/json');
      assert.strictEqual(response.body, '{"item":"Widget","input":{"id":123}}');

      // Diagnostics verification
      assert.ok(coordinator.serializationEngine);
      const serDiag = coordinator.serializationEngine.diagnostics.getSnapshot();
      assert.strictEqual(serDiag.totalSerializations, 1);
      assert.strictEqual(serDiag.successfulSerializations, 1);
      assert.strictEqual(serDiag.failedSerializations, 0);

      await tm.stop();
      await app.stop();
    },
  );

  // ─── 11. HttpTransportBuilder & Manager Diagnostics ─────────────────────────

  await t.test(
    '11a. HttpTransportBuilder & Manager: withSerializer, transformer, locking, and diagnostics',
    async () => {
      const app = ApplicationIntegrationBuilder.create().build();
      app.applicationManager.register('items.create', {
        async execute(input: unknown) {
          const body = (input as { body?: unknown })?.body ?? input;
          return { id: 101, created: true, input: body };
        },
      });
      await app.start();

      const router = new HttpRouter();
      router.post('/items', 'items.create');

      const customTransformer = new DefaultHttpResponseTransformer('custom-tf');

      const builder = HttpTransportBuilder.create()
        .withApplication(app)
        .withRouter(router)
        .withSerializer(new HttpJsonSerializer())
        .withResponseTransformer(customTransformer);

      const manager = builder.build();
      await manager.start();

      const res = await manager.handleRoutedRequest({
        method: 'POST',
        url: '/items',
        path: '/items',
        headers: { 'Content-Type': 'application/json' },
        body: { name: 'Gadget' },
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers['content-type'], 'application/json');
      assert.strictEqual(res.body, '{"id":101,"created":true,"input":{"name":"Gadget"}}');

      const diag = manager.getSerializationDiagnostics();
      assert.ok(diag);
      assert.strictEqual(diag.totalSerializations, 1);
      assert.strictEqual(diag.successfulSerializations, 1);
      assert.strictEqual(diag.failedSerializations, 0);

      manager.resetDiagnostics();
      const resetDiag = manager.getSerializationDiagnostics();
      assert.ok(resetDiag);
      assert.strictEqual(resetDiag.totalSerializations, 0);

      await manager.stop();
      await app.stop();
    },
  );

  // ─── 12. Reverse Middleware Unwinding with Serialized Response ──────────────

  await t.test(
    '12. Middleware reverse unwinding inspects and enriches serialized response',
    async () => {
      const app = ApplicationIntegrationBuilder.create().build();
      app.applicationManager.register('echo', {
        async execute(input: unknown) {
          return { echo: input };
        },
      });
      await app.start();

      const router = new HttpRouter();
      router.get('/echo', 'echo');

      // Middleware that inspects serialized body on the unwind return leg
      router.use({
        id: 'response-enricher',
        name: 'ResponseEnricher',
        async execute(_ctx, next) {
          const res = (await next()) as HttpResponse;
          // Verify on return leg that body is already a serialized JSON string
          assert.strictEqual(typeof res.body, 'string');
          assert.strictEqual(res.headers['content-type'], 'application/json');

          return {
            ...res,
            headers: {
              ...res.headers,
              'x-middleware-unwound': 'true',
            },
          };
        },
      });

      const manager = HttpTransportBuilder.create()
        .withApplication(app)
        .withRouter(router)
        .withSerializer(new HttpJsonSerializer())
        .build();

      await manager.start();

      const res = await manager.handleRoutedRequest({
        method: 'GET',
        url: '/echo',
        path: '/echo',
        headers: {},
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers['x-middleware-unwound'], 'true');
      assert.strictEqual(res.headers['content-type'], 'application/json');
      assert.strictEqual(typeof res.body, 'string');

      await manager.stop();
      await app.stop();
    },
  );

  // ─── 13. 1,000 Concurrent Responses High-Load Test ──────────────────────────

  await t.test(
    '13. High-Concurrency: 1,000 concurrent responses maintain strict isolation with zero cross-talk',
    async () => {
      const CONCURRENCY = 1000;
      const app = ApplicationIntegrationBuilder.create().build();

      app.applicationManager.register('compute', {
        async execute(input: unknown) {
          const body = (input as { body?: { n?: number } })?.body ?? (input as { n?: number });
          const num = body?.n ?? 0;
          if (num % 4 === 0) {
            // Explicit 201 Created pattern
            return {
              status: 201,
              result: num * 2,
              token: 'secret-token',
            };
          }
          if (num % 4 === 1) {
            // Explicit 204 No Content pattern
            return {
              status: 204,
            };
          }
          // Regular response with password to redact
          return {
            result: num * 2,
            password: `pwd-${num}`,
          };
        },
      });
      await app.start();

      const router = new HttpRouter();
      router.post('/compute', 'compute');

      const manager = HttpTransportBuilder.create()
        .withApplication(app)
        .withRouter(router)
        .withSerializer(new HttpJsonSerializer())
        .build();

      await manager.start();

      const tasks = Array.from({ length: CONCURRENCY }, async (_, idx) => {
        const res = await manager.handleRoutedRequest(
          {
            method: 'POST',
            url: '/compute',
            path: '/compute',
            headers: { 'Content-Type': 'application/json' },
            body: { n: idx },
          },
          {
            fieldsToRedact: ['password'],
          },
        );

        if (idx % 4 === 0) {
          assert.strictEqual(res.status, 201);
          assert.strictEqual(
            res.body,
            JSON.stringify({ status: 201, result: idx * 2, token: 'secret-token' }),
          );
          assert.strictEqual(res.headers['content-type'], 'application/json');
        } else if (idx % 4 === 1) {
          assert.strictEqual(res.status, 204);
          assert.strictEqual(res.body, undefined);
          assert.strictEqual(res.headers['content-type'], undefined);
        } else {
          assert.strictEqual(res.status, 200);
          assert.strictEqual(res.body, JSON.stringify({ result: idx * 2, password: '[REDACTED]' }));
          assert.strictEqual(res.headers['content-type'], 'application/json');
        }
      });

      await Promise.all(tasks);

      const diag = manager.getSerializationDiagnostics();
      assert.ok(diag);
      // 250 requests were 204 No Content which skipped the serializer engine
      assert.strictEqual(diag.totalSerializations, 750);
      assert.strictEqual(diag.successfulSerializations, 750);
      assert.strictEqual(diag.failedSerializations, 0);

      await manager.stop();
      await app.stop();
    },
  );

  // ─── 14. Diagnostics Security ───────────────────────────────────────────────

  await t.test(
    '14. Diagnostics Security: metrics snapshot contains purely numbers with zero payload retention',
    () => {
      const diag = new HttpSerializationDiagnostics();
      diag.recordSerializationStarted();
      diag.recordSerializationSuccess(12.5);
      diag.recordSerializationFailure(50, true, true);
      diag.recordTransformationFailure();
      diag.recordResolutionFailure();

      const snap = diag.getSnapshot();
      for (const [key, val] of Object.entries(snap)) {
        assert.strictEqual(
          typeof val,
          'number',
          `Diagnostics field '${key}' must be a pure numerical counter/duration`,
        );
      }

      const snapStr = JSON.stringify(snap);
      assert.ok(!snapStr.includes('password'));
      assert.ok(!snapStr.includes('token'));
      assert.ok(!snapStr.includes('body'));
    },
  );

  // ─── 15. Architectural Boundary Verification ────────────────────────────────

  await t.test(
    '15. Critical Architectural Boundary: @coreforge/http has zero dependency on higher layers',
    () => {
      const packageJsonPath = path.resolve(__dirname, '../../package.json');
      const content = fs.readFileSync(packageJsonPath, 'utf8');
      const pkg = JSON.parse(content);

      const allDeps = {
        ...(pkg.dependencies || {}),
        ...(pkg.devDependencies || {}),
        ...(pkg.peerDependencies || {}),
      };

      // Forbidden higher layers
      const forbidden = [
        '@coreforge/runtime',
        '@coreforge/runtime-orchestrator',
        '@coreforge/runtime-initializer',
      ];
      for (const f of forbidden) {
        assert.strictEqual(
          f in allDeps,
          false,
          `Architectural boundary violated: @coreforge/http must not depend on ${f}`,
        );
      }
    },
  );
});
