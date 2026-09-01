import * as assert from 'node:assert';
import { test } from 'node:test';

import type { HttpResponse, HttpSerializer } from '@coreforge/contracts';

import {
  HttpError,
  HttpResponseSnapshot,
  HttpResponseTransformationError,
  HttpResponseValidator,
  HttpSerializationCancellationError,
  HttpSerializationConfigurationError,
  HttpSerializationError,
  HttpSerializationExecutionError,
  HttpSerializationTimeoutError,
  HttpSerializerDuplicateError,
  HttpSerializerNotFoundError,
  HttpSerializerRegistrationError,
  HttpSerializerValidationError,
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
});
