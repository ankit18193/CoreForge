import * as assert from 'node:assert';
import { test } from 'node:test';

import { CoreForgeError } from '@coreforge/errors';

import {
  CauseSanitizer,
  ErrorClassifier,
  ErrorHandler,
  ErrorHandlerRegistrationError,
  ErrorHandlerRegistry,
  ErrorHandlerResolver,
  ErrorNormalizer,
  ErrorResultFactory,
  ErrorSanitizer,
} from '../src/index';

test('CoreForge Application Error Handling & Classification Engine (@coreforge/error-handling) - Stage 1', async (t) => {
  await t.test(
    '1. Error Classification: Deterministically classifies CoreForge & JS errors',
    () => {
      const valErr = new CoreForgeError('Invalid input', 'CF-VALIDATION-INVALID-INPUT');
      assert.strictEqual(ErrorClassifier.classify(valErr), 'VALIDATION');

      const authErr = new CoreForgeError('Invalid token', 'CF-AUTHENTICATION-FAILED');
      assert.strictEqual(ErrorClassifier.classify(authErr), 'AUTHENTICATION');

      const forbErr = new CoreForgeError('Access denied', 'CF-AUTHORIZATION-FORBIDDEN');
      assert.strictEqual(ErrorClassifier.classify(forbErr), 'AUTHORIZATION');

      const nfErr = new CoreForgeError('Not found', 'CF-RESOURCE-NOT_FOUND');
      assert.strictEqual(ErrorClassifier.classify(nfErr), 'NOT_FOUND');

      const cancelErr = new Error('Operation aborted by execution context');
      assert.strictEqual(ErrorClassifier.classify(cancelErr), 'CANCELLED');

      const timeoutErr = new Error('Request timed out');
      assert.strictEqual(ErrorClassifier.classify(timeoutErr), 'TIMEOUT');

      const typeErr = new TypeError('Cannot read properties of undefined');
      assert.strictEqual(ErrorClassifier.classify(typeErr), 'INTERNAL');

      const unknownErr = { custom: 'problem' };
      assert.strictEqual(ErrorClassifier.classify(unknownErr), 'UNKNOWN');

      assert.strictEqual(ErrorClassifier.classify(null), 'UNKNOWN');
      assert.strictEqual(ErrorClassifier.classify(undefined), 'UNKNOWN');
      assert.strictEqual(ErrorClassifier.classify('raw string error'), 'UNKNOWN');
    },
  );

  await t.test(
    '2. Error Normalization: Normalizes arbitrary throwables safely into ApplicationError',
    () => {
      const fromString = ErrorNormalizer.normalize('String error message');
      assert.strictEqual(fromString.message, 'String error message');
      assert.strictEqual(fromString.category, 'UNKNOWN');
      assert.strictEqual(typeof fromString.timestamp, 'number');

      const fromNull = ErrorNormalizer.normalize(null);
      assert.strictEqual(fromNull.category, 'UNKNOWN');
      assert.ok(fromNull.message.includes('null or undefined'));

      const fromNum = ErrorNormalizer.normalize(500);
      assert.strictEqual(fromNum.message, '500');
      assert.strictEqual(fromNum.category, 'UNKNOWN');

      const fromError = ErrorNormalizer.normalize(
        new CoreForgeError('Item not found', 'CF-ITEM-NOT_FOUND', { itemId: '123' }),
      );
      assert.strictEqual(fromError.category, 'NOT_FOUND');
      assert.strictEqual(fromError.message, 'Item not found');
      assert.deepStrictEqual(fromError.details, { itemId: '123' });
      assert.strictEqual(fromError.stack, undefined); // stack omitted by default
    },
  );

  await t.test('3. Sensitive Information Sanitization: Redacts credentials and passwords', () => {
    const sensitiveDetails = {
      user: 'alice',
      password: 'my_super_secret_password',
      apiKey: 'xyz-secret-key-12345',
      bearerToken: 'eyJhbGciOi...',
      nested: {
        authorizationHeader: 'Bearer eyJ...',
        secretValue: 'confidential',
        safeProperty: 'public_value',
      },
    };

    const sanitized = ErrorSanitizer.sanitize(sensitiveDetails);

    assert.strictEqual(sanitized.password, '[REDACTED]');
    assert.strictEqual(sanitized.apiKey, '[REDACTED]');
    assert.strictEqual(sanitized.bearerToken, '[REDACTED]');
    assert.strictEqual(sanitized.nested.authorizationHeader, '[REDACTED]');
    assert.strictEqual(sanitized.nested.secretValue, '[REDACTED]');
    assert.strictEqual(sanitized.nested.safeProperty, 'public_value');
  });

  await t.test('4. Circular Metadata & Cause Sanitization: Replaces cycles with [Circular]', () => {
    const circularObj: { name: string; self?: unknown } = { name: 'cycle' };
    circularObj.self = circularObj;

    const sanitized = ErrorSanitizer.sanitize(circularObj);
    assert.strictEqual((sanitized as { self: unknown }).self, '[Circular]');

    // Circular cause
    const causeA = new Error('Cause A');
    const causeB = new Error('Cause B');
    (causeA as { cause?: unknown }).cause = causeB;
    (causeB as { cause?: unknown }).cause = causeA;

    const sanitizedCause = CauseSanitizer.sanitizeCause(causeA) as { cause: { cause: unknown } };
    assert.strictEqual(sanitizedCause.cause.cause, '[Circular]');
  });

  await t.test(
    '5. Handler Registry & Resolver: Deterministic priority & category filtering',
    () => {
      const registry = new ErrorHandlerRegistry();

      const handlerGeneral: ErrorHandler = { handle: () => ({ action: 'HANDLE' }) };
      const handlerValidation: ErrorHandler = { handle: () => ({ action: 'HANDLE' }) };
      const handlerHighPriority: ErrorHandler = { handle: () => ({ action: 'HANDLE' }) };

      registry.register(handlerGeneral, { priority: 10 });
      registry.register(handlerValidation, { priority: 50, category: 'VALIDATION' });
      registry.register(handlerHighPriority, { priority: 100 });

      const valErr = ErrorNormalizer.normalize(new CoreForgeError('Invalid', 'CF-VALIDATION-ERR'));
      const resolvedVal = ErrorHandlerResolver.resolve(registry, valErr);
      assert.strictEqual(resolvedVal.length, 3);
      assert.strictEqual(resolvedVal[0].priority, 100);
      assert.strictEqual(resolvedVal[1].priority, 50);
      assert.strictEqual(resolvedVal[2].priority, 10);

      const notFoundErr = ErrorNormalizer.normalize(
        new CoreForgeError('Not found', 'CF-NOT_FOUND'),
      );
      const resolvedNotFound = ErrorHandlerResolver.resolve(registry, notFoundErr);
      assert.strictEqual(resolvedNotFound.length, 2); // skips validation-only handler
    },
  );

  await t.test('6. Duplicate Handler Registration ID is rejected', () => {
    const registry = new ErrorHandlerRegistry();
    const handler: ErrorHandler = { handle: () => ({ action: 'HANDLE' }) };

    registry.register(handler, { id: 'custom_handler' });
    assert.throws(
      () => registry.register(handler, { id: 'custom_handler' }),
      (err: Error) => err instanceof ErrorHandlerRegistrationError,
    );
  });

  await t.test('7. Result Factory: creates deeply frozen results', () => {
    const err = ErrorNormalizer.normalize(new Error('Sample'));
    const result = ErrorResultFactory.createHandled(err, 'exec-123', 5.2, 1);

    assert.strictEqual(result.state, 'HANDLED');
    assert.strictEqual(result.executionId, 'exec-123');
    assert.strictEqual(result.durationMs, 5.2);
    assert.strictEqual(result.matchedHandlers, 1);
    assert.throws(() => {
      (result as { state: string }).state = 'MUTATED';
    });
  });
});
