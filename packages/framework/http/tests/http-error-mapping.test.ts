import * as assert from 'node:assert';
import { test } from 'node:test';

import type { HttpErrorMapper, HttpErrorMappingResult } from '@coreforge/contracts';

import {
  CoreForgeError,
  HttpError,
  HttpErrorMapperDuplicateError,
  HttpErrorMappingConfigurationError,
  HttpErrorMappingError,
  HttpErrorMappingExecutionError,
  HttpErrorMapperNotFoundError,
  HttpErrorMapperRegistrationError,
  HttpErrorMappingValidationError,
  HttpErrorMappingValidator,
  HttpPublicErrorSnapshot,
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
});
