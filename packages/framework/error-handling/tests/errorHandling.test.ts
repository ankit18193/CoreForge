import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { test } from 'node:test';

import { CoreForgeError } from '@coreforge/errors';
import { ExecutionContextManager } from '@coreforge/execution-context';

import {
  CauseSanitizer,
  ErrorClassifier,
  ErrorHandler,
  ErrorHandlerExecutor,
  ErrorHandlerRecursionError,
  ErrorHandlerRegistrationError,
  ErrorHandlerRegistry,
  ErrorHandlerResolver,
  ErrorHandlingBuilder,
  ErrorHandlingDiagnostics,
  ErrorHandlingEngine,
  ErrorHandlingStateError,
  ErrorNormalizer,
  ErrorResultFactory,
  ErrorSanitizer,
  ErrorSnapshot,
} from '../src/index';

test('CoreForge Application Error Handling & Classification Engine (@coreforge/error-handling)', async (t) => {
  await t.test('1. Lifecycle: Rejects process before start(), start() is idempotent', async () => {
    const engine = new ErrorHandlingEngine();
    assert.strictEqual(engine.ready, false);

    await assert.rejects(
      async () => engine.process(new Error('Pre-start error')),
      (err: Error) => err instanceof ErrorHandlingStateError,
    );

    await engine.start();
    assert.strictEqual(engine.ready, true);

    // Idempotent start()
    await engine.start();
    assert.strictEqual(engine.ready, true);

    const result = await engine.process(new Error('Running error'));
    assert.strictEqual(result.state, 'UNRESOLVED');

    await engine.stop();
  });

  await t.test(
    '2. Lifecycle: Rejection during STOPPING and after STOPPED, idempotent stop()',
    async () => {
      const engine = new ErrorHandlingEngine({ autoStart: true });
      assert.strictEqual(engine.ready, true);

      await engine.stop();
      assert.strictEqual(engine.ready, false);

      await assert.rejects(
        async () => engine.process(new Error('Post-stop error')),
        (err: Error) => err instanceof ErrorHandlingStateError,
      );

      // Idempotent stop()
      await engine.stop();
    },
  );

  await t.test(
    '3. Registration: Registration before startup works, rejected after READY',
    async () => {
      const engine = new ErrorHandlingEngine();

      const handler: ErrorHandler = {
        handle() {
          return { action: 'HANDLE' };
        },
      };

      engine.registerHandler(handler, { id: 'pre_start_handler' });
      await engine.start();

      assert.throws(
        () => engine.registerHandler(handler, { id: 'post_start_handler' }),
        (err: Error) => err instanceof ErrorHandlerRegistrationError,
      );

      await engine.stop();
    },
  );

  await t.test('4. Registration: Duplicate handler registration ID is rejected', () => {
    const registry = new ErrorHandlerRegistry();
    const handler: ErrorHandler = { handle: () => ({ action: 'HANDLE' }) };

    registry.register(handler, { id: 'dup_handler' });
    assert.throws(
      () => registry.register(handler, { id: 'dup_handler' }),
      (err: Error) => err instanceof ErrorHandlerRegistrationError,
    );
  });

  await t.test('5. Classification: CoreForge error categories', () => {
    const valErr = new CoreForgeError('Invalid email', 'CF-VALIDATION-INVALID-EMAIL');
    assert.strictEqual(ErrorClassifier.classify(valErr), 'VALIDATION');

    const authErr = new CoreForgeError('Token expired', 'CF-AUTHENTICATION-EXPIRED');
    assert.strictEqual(ErrorClassifier.classify(authErr), 'AUTHENTICATION');

    const authzErr = new CoreForgeError('Access denied', 'CF-AUTHORIZATION-DENIED');
    assert.strictEqual(ErrorClassifier.classify(authzErr), 'AUTHORIZATION');

    const nfErr = new CoreForgeError('User not found', 'CF-USER-NOT_FOUND');
    assert.strictEqual(ErrorClassifier.classify(nfErr), 'NOT_FOUND');

    const conflictErr = new CoreForgeError('Duplicate email', 'CF-USER-DUPLICATE');
    assert.strictEqual(ErrorClassifier.classify(conflictErr), 'CONFLICT');

    const rateLimitErr = new CoreForgeError('Rate limit exceeded', 'CF-RATE-LIMIT-EXCEEDED');
    assert.strictEqual(ErrorClassifier.classify(rateLimitErr), 'RATE_LIMITED');

    const depErr = new CoreForgeError('Database gateway failure', 'CF-DATABASE-DEPENDENCY');
    assert.strictEqual(ErrorClassifier.classify(depErr), 'DEPENDENCY');

    const intErr = new CoreForgeError('Internal crash', 'CF-INTERNAL-ERROR');
    assert.strictEqual(ErrorClassifier.classify(intErr), 'INTERNAL');
  });

  await t.test('6. Classification: Unknown error objects and primitives', () => {
    assert.strictEqual(ErrorClassifier.classify('string error'), 'UNKNOWN');
    assert.strictEqual(ErrorClassifier.classify(404), 'UNKNOWN');
    assert.strictEqual(ErrorClassifier.classify(null), 'UNKNOWN');
    assert.strictEqual(ErrorClassifier.classify(undefined), 'UNKNOWN');
    assert.strictEqual(ErrorClassifier.classify({ unclassified: true }), 'UNKNOWN');
  });

  await t.test('7. Normalization: String throwable normalization', () => {
    const appErr = ErrorNormalizer.normalize('Fatal database connection string issue');
    assert.strictEqual(appErr.name, 'Error');
    assert.strictEqual(appErr.message, 'Fatal database connection string issue');
    assert.strictEqual(appErr.category, 'UNKNOWN');
    assert.strictEqual(appErr.code, 'CF-UNKNOWN-ERROR');
    assert.strictEqual(typeof appErr.timestamp, 'number');
  });

  await t.test('8. Normalization: Object throwable normalization', () => {
    const customObj = {
      name: 'CustomProblem',
      message: 'Network issue occurred',
      code: 'CF-NETWORK-DEPENDENCY',
      details: { host: 'api.example.com' },
    };

    const appErr = ErrorNormalizer.normalize(customObj);
    assert.strictEqual(appErr.name, 'CustomProblem');
    assert.strictEqual(appErr.message, 'Network issue occurred');
    assert.strictEqual(appErr.code, 'CF-NETWORK-DEPENDENCY');
    assert.strictEqual(appErr.category, 'DEPENDENCY');
    assert.deepStrictEqual(appErr.details, { host: 'api.example.com' });
  });

  await t.test('9. Normalization: Null and undefined throwables', () => {
    const fromNull = ErrorNormalizer.normalize(null);
    assert.strictEqual(fromNull.category, 'UNKNOWN');
    assert.ok(fromNull.message.includes('null or undefined'));

    const fromUndefined = ErrorNormalizer.normalize(undefined);
    assert.strictEqual(fromUndefined.category, 'UNKNOWN');
    assert.ok(fromUndefined.message.includes('null or undefined'));
  });

  await t.test('10. Normalization: Number and boolean throwables', () => {
    const fromNumber = ErrorNormalizer.normalize(503);
    assert.strictEqual(fromNumber.message, '503');
    assert.strictEqual(fromNumber.category, 'UNKNOWN');

    const fromBool = ErrorNormalizer.normalize(false);
    assert.strictEqual(fromBool.message, 'false');
    assert.strictEqual(fromBool.category, 'UNKNOWN');
  });

  await t.test('11. Classification & Normalization: Cancellation classification', () => {
    const abortErr = new Error('Operation aborted by execution context cancellation signal');
    assert.strictEqual(ErrorClassifier.classify(abortErr), 'CANCELLED');

    const normalized = ErrorNormalizer.normalize(abortErr);
    assert.strictEqual(normalized.category, 'CANCELLED');
  });

  await t.test('12. Classification & Normalization: Timeout classification', () => {
    const timeoutErr = new Error('Operation timed out after 5000ms');
    assert.strictEqual(ErrorClassifier.classify(timeoutErr), 'TIMEOUT');

    const normalized = ErrorNormalizer.normalize(timeoutErr);
    assert.strictEqual(normalized.category, 'TIMEOUT');
  });

  await t.test(
    '13. Sanitization: Redacts sensitive keys (password, secret, token, api_key, cookie, etc.)',
    () => {
      const rawDetails = {
        username: 'john_doe',
        password: 'super_secret_password',
        token: 'jwt.token.here',
        secretKey: 'top_secret',
        authorization: 'Bearer 12345',
        cookie: 'sessionId=abc',
        credential: 'key',
        apikey: 'ak_live_123',
        privateKey: '---BEGIN RSA---',
        bearer: 'token_val',
        regularField: 'safe_value',
      };

      const sanitized = ErrorSanitizer.sanitize(rawDetails);

      assert.strictEqual(sanitized.username, 'john_doe');
      assert.strictEqual(sanitized.password, '[REDACTED]');
      assert.strictEqual(sanitized.token, '[REDACTED]');
      assert.strictEqual(sanitized.secretKey, '[REDACTED]');
      assert.strictEqual(sanitized.authorization, '[REDACTED]');
      assert.strictEqual(sanitized.cookie, '[REDACTED]');
      assert.strictEqual(sanitized.credential, '[REDACTED]');
      assert.strictEqual(sanitized.apikey, '[REDACTED]');
      assert.strictEqual(sanitized.privateKey, '[REDACTED]');
      assert.strictEqual(sanitized.bearer, '[REDACTED]');
      assert.strictEqual(sanitized.regularField, 'safe_value');
    },
  );

  await t.test('14. Sanitization: Case-insensitive sensitive key matching', () => {
    const rawDetails = {
      PaSsWoRd: 'secret1',
      SECRET_TOKEN: 'secret2',
      AuThOrIzAtIoN: 'secret3',
    };

    const sanitized = ErrorSanitizer.sanitize(rawDetails);
    assert.strictEqual(sanitized.PaSsWoRd, '[REDACTED]');
    assert.strictEqual(sanitized.SECRET_TOKEN, '[REDACTED]');
    assert.strictEqual(sanitized.AuThOrIzAtIoN, '[REDACTED]');
  });

  await t.test(
    '15. Sanitization: Circular metadata handling replaces cycles with [Circular]',
    () => {
      const cyclicObj: { name: string; nested?: unknown } = { name: 'root' };
      cyclicObj.nested = cyclicObj;

      const sanitized = ErrorSanitizer.sanitize(cyclicObj);
      assert.strictEqual((sanitized as { nested: unknown }).nested, '[Circular]');
    },
  );

  await t.test(
    '16. Sanitization: Circular cause protection replaces cyclic causes with [Circular]',
    () => {
      const causeA = new Error('First cause');
      const causeB = new Error('Second cause');
      (causeA as { cause?: unknown }).cause = causeB;
      (causeB as { cause?: unknown }).cause = causeA;

      const sanitized = CauseSanitizer.sanitizeCause(causeA) as { cause: { cause: unknown } };
      assert.strictEqual(sanitized.cause.cause, '[Circular]');
    },
  );

  await t.test('17. Sanitization: Cause depth limit truncates deeply nested causes', () => {
    let currentError = new Error('Root cause');
    for (let i = 0; i < 10; i++) {
      const parent = new Error(`Cause level ${i}`);
      (parent as { cause?: unknown }).cause = currentError;
      currentError = parent;
    }

    const sanitized = CauseSanitizer.sanitizeCause(currentError, 3) as {
      cause?: { cause?: { cause?: unknown } };
    };
    assert.strictEqual(sanitized.cause?.cause?.cause, '[Truncated Cause]');
  });

  await t.test(
    '18. Stack Exposure: Stack is omitted by default and included when includeStack is true',
    () => {
      const rawErr = new Error('Test stack error');

      const defaultNormalized = ErrorNormalizer.normalize(rawErr);
      assert.strictEqual(defaultNormalized.stack, undefined);

      const withStackNormalized = ErrorNormalizer.normalize(rawErr, { includeStack: true });
      assert.strictEqual(typeof withStackNormalized.stack, 'string');
    },
  );

  await t.test('19. Result & Snapshot Immutability: Deep freeze protection', () => {
    const appErr = ErrorNormalizer.normalize(new Error('Sample'));
    const snapshot = ErrorSnapshot.create(appErr);

    assert.throws(() => {
      (snapshot as { message: string }).message = 'Mutated';
    });

    const handledRes = ErrorResultFactory.createHandled(appErr, 'exec-1', 10, 1);
    assert.throws(() => {
      (handledRes as { state: string }).state = 'MUTATED';
    });
  });

  await t.test('20. Handler Priority & Sequence Ordering: priority DESC, sequence ASC', () => {
    const registry = new ErrorHandlerRegistry();
    const order: string[] = [];

    const h1: ErrorHandler = {
      handle: () => {
        order.push('lowPriority1');
        return { action: 'RETHROW' };
      },
    };
    const h2: ErrorHandler = {
      handle: () => {
        order.push('highPriority');
        return { action: 'RETHROW' };
      },
    };
    const h3: ErrorHandler = {
      handle: () => {
        order.push('lowPriority2');
        return { action: 'RETHROW' };
      },
    };

    registry.register(h1, { id: 'h1', priority: 10 });
    registry.register(h2, { id: 'h2', priority: 100 });
    registry.register(h3, { id: 'h3', priority: 10 });

    const error = ErrorNormalizer.normalize(new Error('Test order'));
    const resolved = ErrorHandlerResolver.resolve(registry, error);

    assert.strictEqual(resolved[0].id, 'h2'); // Priority 100
    assert.strictEqual(resolved[1].id, 'h1'); // Priority 10, Sequence 1
    assert.strictEqual(resolved[2].id, 'h3'); // Priority 10, Sequence 2
  });

  await t.test('21. Handler Action: HANDLE marks error as HANDLED', async () => {
    const engine = new ErrorHandlingEngine();

    engine.registerHandler({
      handle() {
        return { action: 'HANDLE' };
      },
    });

    await engine.start();

    const result = await engine.process(new Error('Handled error'));
    assert.strictEqual(result.state, 'HANDLED');
    assert.strictEqual(result.matchedHandlers, 1);

    const diag = engine.getDiagnostics();
    assert.strictEqual(diag.handledErrors, 1);

    await engine.stop();
  });

  await t.test('22. Handler Action: TRANSFORM normalizes transformed error', async () => {
    const engine = new ErrorHandlingEngine();

    engine.registerHandler({
      handle() {
        return {
          action: 'TRANSFORM',
          transformedError: new CoreForgeError(
            'Transformed validation error',
            'CF-VALIDATION-TRANSFORMED',
          ),
        };
      },
    });

    await engine.start();

    const result = await engine.process(new Error('Original technical error'));
    assert.strictEqual(result.state, 'TRANSFORMED');
    assert.strictEqual(result.transformedError?.message, 'Transformed validation error');
    assert.strictEqual(result.transformedError?.category, 'VALIDATION');

    const diag = engine.getDiagnostics();
    assert.strictEqual(diag.transformedErrors, 1);

    await engine.stop();
  });

  await t.test('23. Handler Action: RECOVER returns recovered result value', async () => {
    const engine = new ErrorHandlingEngine();

    engine.registerHandler({
      handle() {
        return {
          action: 'RECOVER',
          result: { fallbackData: 'cached_fallback_value', recovered: true },
        };
      },
    });

    await engine.start();

    const result = await engine.process(new Error('Service unavailable'));
    assert.strictEqual(result.state, 'RECOVERED');
    assert.deepStrictEqual(result.result, {
      fallbackData: 'cached_fallback_value',
      recovered: true,
    });

    const diag = engine.getDiagnostics();
    assert.strictEqual(diag.recoveredErrors, 1);

    await engine.stop();
  });

  await t.test('24. Handler Action: RETHROW passes to subsequent handlers', async () => {
    const engine = new ErrorHandlingEngine();

    let secondHandlerRan = false;

    engine.registerHandler(
      {
        handle() {
          return { action: 'RETHROW' };
        },
      },
      { priority: 100 },
    );

    engine.registerHandler(
      {
        handle() {
          secondHandlerRan = true;
          return { action: 'HANDLE' };
        },
      },
      { priority: 10 },
    );

    await engine.start();

    const result = await engine.process(new Error('Rethrow error'));
    assert.strictEqual(result.state, 'HANDLED');
    assert.strictEqual(secondHandlerRan, true);

    await engine.stop();
  });

  await t.test(
    '25. Handler Failure Isolation: Throwing handler does not crash engine',
    async () => {
      const engine = new ErrorHandlingEngine();

      let backupHandlerRan = false;

      engine.registerHandler(
        {
          handle() {
            throw new Error('Handler crashed unexpectedly');
          },
        },
        { priority: 100 },
      );

      engine.registerHandler(
        {
          handle() {
            backupHandlerRan = true;
            return { action: 'HANDLE' };
          },
        },
        { priority: 10 },
      );

      await engine.start();

      const result = await engine.process(new Error('Operation error'));
      assert.strictEqual(result.state, 'HANDLED');
      assert.strictEqual(backupHandlerRan, true);

      const diag = engine.getDiagnostics();
      assert.strictEqual(diag.handlerFailures, 1);

      await engine.stop();
    },
  );

  await t.test(
    '26. Handler Recursion Protection: Loop detection throws ErrorHandlerRecursionError',
    async () => {
      const contextManager = new ExecutionContextManager();
      const context = contextManager.create();

      const cyclicHandler: ErrorHandler = {
        handle() {
          return { action: 'RETHROW' };
        },
      };

      // Inject entry twice to simulate a synthetic loop
      const entry = {
        id: 'loop_handler',
        handler: cyclicHandler,
        priority: 10,
        sequence: 1,
      };

      await assert.rejects(
        async () => {
          const error = ErrorNormalizer.normalize(new Error('Loop test'));
          await ErrorHandlerExecutor.execute(
            [entry, entry],
            error,
            context,
            new Error('Loop test'),
            new ErrorHandlingDiagnostics(),
          );
        },
        (err: Error) => err instanceof ErrorHandlerRecursionError,
      );

      await contextManager.stop();
    },
  );

  await t.test(
    '27. ExecutionContext Propagation: active context available via contextManager.current()',
    async () => {
      const contextManager = new ExecutionContextManager();
      const engine = new ErrorHandlingEngine({ contextManager });

      let capturedId: string | undefined;

      engine.registerHandler({
        handle(_err, context) {
          capturedId = contextManager.current()?.executionId;
          assert.strictEqual(capturedId, context.executionId);
          return { action: 'HANDLE' };
        },
      });

      await engine.start();

      const result = await engine.process(new Error('Context propagation test'));
      assert.strictEqual(result.executionId, capturedId);
      assert.strictEqual(contextManager.current(), undefined);

      await engine.stop();
      await contextManager.stop();
    },
  );

  await t.test(
    '28. Cancellation Classification: Aborted context results in CANCELLED state',
    async () => {
      const contextManager = new ExecutionContextManager();
      const engine = new ErrorHandlingEngine({ contextManager });

      let handlerRan = false;

      engine.registerHandler({
        handle() {
          handlerRan = true;
          return { action: 'HANDLE' };
        },
      });

      await engine.start();

      const cancelledContext = contextManager.create();
      cancelledContext.cancel();

      const result = await engine.process(new Error('Some error'), {
        context: cancelledContext,
      });

      assert.strictEqual(result.state, 'CANCELLED');
      assert.strictEqual(handlerRan, false);

      const diag = engine.getDiagnostics();
      assert.strictEqual(diag.cancelledErrors, 1);

      await engine.stop();
      await contextManager.stop();
    },
  );

  await t.test(
    '29. Diagnostics Security: Zero payloads, credentials, error stacks, or execution IDs stored',
    async () => {
      const engine = new ErrorHandlingEngine({ autoStart: true });

      const result = await engine.process(
        new CoreForgeError('Secret leak test', 'CF-TEST', {
          authToken: 'secret_token_12345',
          password: 'confidential_password',
        }),
        { includeStack: true },
      );

      const diag = engine.getDiagnostics();
      const serialized = JSON.stringify(diag);

      assert.strictEqual(serialized.includes('secret_token_12345'), false);
      assert.strictEqual(serialized.includes('confidential_password'), false);
      assert.strictEqual(serialized.includes('Secret leak test'), false);
      assert.strictEqual(serialized.includes(result.executionId), false);

      await engine.stop();
    },
  );

  await t.test(
    '30. 1,000 Concurrent Error-Processing Operations: High-concurrency isolation',
    async () => {
      const engine = new ErrorHandlingEngine({ autoStart: true });

      const promises: Promise<void>[] = [];
      for (let i = 0; i < 1000; i++) {
        promises.push(
          engine.process(new Error(`Error batch ${i}`)).then((res) => {
            assert.strictEqual(res.state, 'UNRESOLVED');
            assert.strictEqual(res.error.message, `Error batch ${i}`);
          }),
        );
      }

      await Promise.all(promises);

      const diag = engine.getDiagnostics();
      assert.strictEqual(diag.totalErrors, 1000);
      assert.strictEqual(diag.activeProcessing, 0);

      await engine.stop();
    },
  );

  await t.test('31. ErrorHandlingBuilder: Fluent API with autoStart', async () => {
    const contextManager = new ExecutionContextManager();

    const engine = ErrorHandlingBuilder.create()
      .withContextManager(contextManager)
      .withIncludeStackDefault(false)
      .withMaxCauseDepthDefault(3)
      .withSensitiveKeys(['customSecret'])
      .withHandler({
        handle() {
          return { action: 'HANDLE' };
        },
      })
      .withAutoStart(true)
      .build();

    assert.strictEqual(engine.ready, true);

    const result = await engine.process(new Error('Builder test'));
    assert.strictEqual(result.state, 'HANDLED');

    await engine.stop();
    await contextManager.stop();
  });

  await t.test(
    '32. Critical Architectural Boundary: Zero higher-layer or forbidden framework dependencies',
    async () => {
      const pkgJsonPath = path.resolve(__dirname, '../../package.json');
      const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

      const deps = Object.keys(pkgJson.dependencies || {});
      const forbidden = [
        '@coreforge/transport',
        '@coreforge/routing',
        '@coreforge/runtime',
        '@coreforge/response',
        '@coreforge/jobs',
        '@coreforge/events',
        '@coreforge/cache',
        '@coreforge/locks',
        '@coreforge/rate-limit',
        '@coreforge/resilience',
        '@coreforge/metrics',
        '@coreforge/tracing',
        '@coreforge/logging',
        '@coreforge/config',
        '@coreforge/dispatch',
        '@coreforge/query',
        '@coreforge/application',
        'redis',
        'rabbitmq',
        'kafka',
        'amqplib',
      ];

      for (const f of forbidden) {
        assert.strictEqual(
          deps.includes(f),
          false,
          `Forbidden dependency detected in @coreforge/error-handling: ${f}`,
        );
      }
    },
  );
});
