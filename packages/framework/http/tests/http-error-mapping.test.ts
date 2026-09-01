import * as assert from 'node:assert';
import { test } from 'node:test';

import type { HttpErrorMapper, HttpErrorMappingResult } from '@coreforge/contracts';

import {
  CoreForgeError,
  HttpError,
  HttpErrorMapperDuplicateError,
  HttpErrorMapperNotFoundError,
  HttpErrorMapperRegistrationError,
  HttpErrorMapperRegistry,
  HttpErrorMapperResolver,
  HttpErrorMappingConfigurationError,
  HttpErrorMappingError,
  HttpErrorMappingExecutionError,
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
});
