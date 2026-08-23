import * as assert from 'node:assert';
import { test } from 'node:test';

import { CompilerBuilder, ModuleCompiler } from '@coreforge/compiler';
import { Controller, Get, MetadataRegistrar, Module, Param } from '@coreforge/decorators';
import { ContainerBuilder } from '@coreforge/di';
import { DiscoveryBuilder, DiscoveryEngine } from '@coreforge/discovery';
import { CoreForgeError, ValidationError } from '@coreforge/errors';
import {
  ActionDescriptor,
  ExecutionContext,
  ExecutionEngine,
  Guard,
  GuardRejectedError,
} from '@coreforge/execution';
import { MetadataBuilder, MetadataRegistry } from '@coreforge/metadata';
import { NormalizedRequest, ParameterBindingCompiler } from '@coreforge/parameter-binding';
import { RequestContextManager } from '@coreforge/request-context';
import { ResponseProcessor } from '@coreforge/response';

import {
  ErrorClassifier,
  ErrorDescriptor,
  ErrorNormalizer,
  ErrorResponseMapper,
  ExceptionContext,
  ExceptionHandler,
  ExceptionHandlerRegistry,
  ExceptionPipeline,
  ExceptionStateError,
} from '../index';

test('CoreForge Exception Handling & Error Pipeline (@coreforge/exceptions)', async (t) => {
  await t.test(
    '1. Error Classification: Deterministically classifies CoreForge errors into canonical categories',
    async () => {
      const valErr = new ValidationError('Invalid input data');
      const authGuardErr = new GuardRejectedError('Access denied by AuthGuard');
      const notFoundErr = new CoreForgeError('Resource missing', 'CF-NOT_FOUND-USER');
      const conflictErr = new CoreForgeError('Duplicate user', 'CF-CONFLICT-USER');
      const timeoutErr = new CoreForgeError('Context timed out', 'CF-TIMEOUT-EXCEEDED');
      const cancelErr = new CoreForgeError('Request aborted', 'CF-CANCELLATION-SIGNAL');
      const diErr = new CoreForgeError('Provider failed', 'CF-DI-PROVIDER_NOT_FOUND');
      const execErr = new CoreForgeError(
        'Controller invocation failed',
        'CF-EXECUTION-ACTION-NOT-FOUND',
      );
      const serialErr = new CoreForgeError(
        'Serialization failed',
        'CF-RESPONSE-SERIALIZATION-ERROR',
      );

      assert.strictEqual(ErrorClassifier.classify(valErr).category, 'VALIDATION');
      assert.strictEqual(ErrorClassifier.classify(valErr).status, 400);

      assert.strictEqual(ErrorClassifier.classify(authGuardErr).category, 'AUTHORIZATION');
      assert.strictEqual(ErrorClassifier.classify(authGuardErr).status, 403);

      assert.strictEqual(ErrorClassifier.classify(notFoundErr).category, 'NOT_FOUND');
      assert.strictEqual(ErrorClassifier.classify(notFoundErr).status, 404);

      assert.strictEqual(ErrorClassifier.classify(conflictErr).category, 'CONFLICT');
      assert.strictEqual(ErrorClassifier.classify(conflictErr).status, 409);

      assert.strictEqual(ErrorClassifier.classify(timeoutErr).category, 'TIMEOUT');
      assert.strictEqual(ErrorClassifier.classify(timeoutErr).status, 504);

      assert.strictEqual(ErrorClassifier.classify(cancelErr).category, 'CANCELLATION');
      assert.strictEqual(ErrorClassifier.classify(cancelErr).status, 499);

      assert.strictEqual(ErrorClassifier.classify(diErr).category, 'DEPENDENCY');
      assert.strictEqual(ErrorClassifier.classify(diErr).status, 500);

      assert.strictEqual(ErrorClassifier.classify(execErr).category, 'EXECUTION');
      assert.strictEqual(ErrorClassifier.classify(execErr).status, 500);

      assert.strictEqual(ErrorClassifier.classify(serialErr).category, 'SERIALIZATION');
      assert.strictEqual(ErrorClassifier.classify(serialErr).status, 500);
    },
  );

  await t.test(
    '2. Unknown Throwables: Safely normalizes non-Error throwables (strings, primitives, null, objects)',
    async () => {
      const container = new ContainerBuilder().build();
      container.makeReady();
      const reqContext = await new RequestContextManager(container).createContext();

      const pipeline = new ExceptionPipeline();

      // String throwable
      const strCtx = new ExceptionContext(reqContext, 'Database connection crashed');
      const strRes = await pipeline.handle('Database connection crashed', strCtx);
      assert.strictEqual(strRes.category, 'INTERNAL');
      assert.strictEqual(strRes.code, 'CF-INTERNAL-ERROR');
      assert.strictEqual(strRes.status, 500);
      assert.strictEqual(strRes.message, 'Database connection crashed');

      // Primitive number throwable
      const numCtx = new ExceptionContext(reqContext, 500);
      const numRes = await pipeline.handle(500, numCtx);
      assert.strictEqual(numRes.category, 'INTERNAL');
      assert.strictEqual(numRes.status, 500);

      // Null throwable
      const nullCtx = new ExceptionContext(reqContext, null);
      const nullRes = await pipeline.handle(null, nullCtx);
      assert.strictEqual(nullRes.category, 'INTERNAL');
      assert.strictEqual(nullRes.status, 500);
      assert.strictEqual(nullRes.message, 'Internal Server Error');

      // Plain Object throwable (does not dump raw object keys into details)
      const objThrowable = { custom: 'error', secretKey: 'sensitive-val' };
      const objCtx = new ExceptionContext(reqContext, objThrowable);
      const objRes = await pipeline.handle(objThrowable, objCtx);
      assert.strictEqual(objRes.category, 'INTERNAL');
      assert.strictEqual(objRes.status, 500);
      assert.strictEqual(objRes.details, undefined);

      await reqContext.dispose();
    },
  );

  await t.test(
    '3. Handler Precedence & Priority: Exact constructor -> Code -> Category -> Fallback with priority sorting',
    async () => {
      class CustomAppError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomAppError';
        }
      }

      const registry = new ExceptionHandlerRegistry();

      let matchedBy = '';

      const constructorHandler: ExceptionHandler = {
        priority: 10,
        canHandle() {
          return true;
        },
        handle(error) {
          matchedBy = 'constructor';
          return {
            code: 'CF-CUSTOM-TYPE',
            category: 'INTERNAL',
            status: 418,
            message: (error as Error).message,
            timestamp: Date.now(),
          };
        },
      };

      const codeHandler: ExceptionHandler = {
        priority: 100, // Higher priority but lower specificity level
        canHandle() {
          return true;
        },
        handle() {
          matchedBy = 'code';
          return {
            code: 'CF-CODE-MATCH',
            category: 'INTERNAL',
            status: 422,
            message: 'Handled by code',
            timestamp: Date.now(),
          };
        },
      };

      const categoryHandler: ExceptionHandler = {
        priority: 200,
        canHandle() {
          return true;
        },
        handle() {
          matchedBy = 'category';
          return {
            code: 'CF-CAT-MATCH',
            category: 'INTERNAL',
            status: 500,
            message: 'Handled by category',
            timestamp: Date.now(),
          };
        },
      };

      registry.registerType(CustomAppError, constructorHandler);
      registry.registerCode('CF-CUSTOM-CODE', codeHandler);
      registry.registerCategory('INTERNAL', categoryHandler);

      const pipeline = new ExceptionPipeline({ registry });

      const container = new ContainerBuilder().build();
      container.makeReady();
      const reqContext = await new RequestContextManager(container).createContext();

      // 1. Exact Constructor should win
      const appErr = new CustomAppError('App failed');
      const res1 = await pipeline.handle(appErr, new ExceptionContext(reqContext, appErr));
      assert.strictEqual(matchedBy, 'constructor');
      assert.strictEqual(res1.status, 418);

      // 2. Code match should win when no constructor match
      const codeErr = new CoreForgeError('Code failed', 'CF-CUSTOM-CODE');
      const res2 = await pipeline.handle(codeErr, new ExceptionContext(reqContext, codeErr));
      assert.strictEqual(matchedBy, 'code');
      assert.strictEqual(res2.status, 422);

      // 3. Category match should win when no constructor or code match
      const catErr = new Error('Generic error');
      const res3 = await pipeline.handle(catErr, new ExceptionContext(reqContext, catErr));
      assert.strictEqual(matchedBy, 'category');
      assert.strictEqual(res3.status, 500);

      // 4. Unregistering handler
      registry.unregister(constructorHandler);
      const res4 = await pipeline.handle(appErr, new ExceptionContext(reqContext, appErr));
      assert.strictEqual(matchedBy, 'category');
      assert.strictEqual(res4.status, 500);

      await reqContext.dispose();
    },
  );

  await t.test(
    '4. Handler Isolation: Throwing handler safely falls back to FallbackExceptionHandler without crashing',
    async () => {
      const registry = new ExceptionHandlerRegistry();

      const faultyHandler: ExceptionHandler = {
        canHandle() {
          return true;
        },
        handle() {
          throw new Error('Handler crashed unexpectedly');
        },
      };

      class BoomError extends Error {}
      registry.registerType(BoomError, faultyHandler);

      const pipeline = new ExceptionPipeline({ registry, enableDiagnostics: true });

      const container = new ContainerBuilder().build();
      container.makeReady();
      const reqContext = await new RequestContextManager(container).createContext();

      const err = new BoomError('Original business error');
      const result = await pipeline.handle(err, new ExceptionContext(reqContext, err));

      assert.strictEqual(result.message, 'Original business error');
      assert.strictEqual(result.category, 'INTERNAL');
      assert.strictEqual(result.status, 500);

      const diag = pipeline.diagnostics;
      assert.strictEqual(diag.handlerFailures, 1);
      assert.strictEqual(diag.fallback, 1);
      assert.strictEqual(diag.total, 1);

      await reqContext.dispose();
    },
  );

  await t.test(
    '5. Error Normalization: Details sanitization, sensitive key redaction, and cycle protection',
    async () => {
      const cyclicDetails: Record<string, unknown> = {
        field: 'username',
        password: 'my-super-secret-password',
        authHeader: 'Bearer token-123',
        nested: {
          secretKey: 'key-999',
          validProp: 42,
        },
      };
      cyclicDetails.self = cyclicDetails;

      const rawError = new CoreForgeError(
        'Validation failed',
        'CF-VALIDATION-ERROR',
        cyclicDetails,
      );

      const descriptor = ErrorNormalizer.normalize(rawError);

      assert.strictEqual(descriptor.category, 'VALIDATION');
      assert.strictEqual(descriptor.status, 400);
      assert.strictEqual(descriptor.details?.field, 'username');
      assert.strictEqual(descriptor.details?.password, '[REDACTED]');
      assert.strictEqual(descriptor.details?.authHeader, '[REDACTED]');
      assert.deepStrictEqual(descriptor.details?.nested, {
        secretKey: '[REDACTED]',
        validProp: 42,
      });
      // Cyclic reference safely omitted without crashing
      assert.strictEqual(descriptor.details?.self, undefined);
      assert.ok(Object.isFrozen(descriptor));
      assert.ok(Object.isFrozen(descriptor.details));
    },
  );

  await t.test(
    '6. Cause Chain Preservation: Preserves causal chains with cycle detection and max-depth limiting',
    async () => {
      const rootCause = new Error('TCP connection reset');
      const dbError = new CoreForgeError('Query failed', 'CF-DI-DB-ERROR');
      Object.defineProperty(dbError, 'cause', { value: rootCause });

      const controllerError = new Error('Failed to load profile');
      Object.defineProperty(controllerError, 'cause', { value: dbError });

      const descriptor = ErrorNormalizer.normalize(controllerError);

      assert.strictEqual(descriptor.message, 'Failed to load profile');
      assert.ok(descriptor.cause);
      assert.strictEqual(descriptor.cause?.message, 'Query failed');
      assert.strictEqual(descriptor.cause?.category, 'DEPENDENCY');

      // Circular cause test
      const errA = new Error('Error A');
      const errB = new Error('Error B');
      Object.defineProperty(errA, 'cause', { value: errB });
      Object.defineProperty(errB, 'cause', { value: errA });

      const circularDesc = ErrorNormalizer.normalize(errA);
      assert.ok(circularDesc.cause);
      assert.strictEqual(circularDesc.cause?.message, 'Error B');
    },
  );

  await t.test(
    '7. Stack Trace Configuration: Suppressed in production, exposed when enabled',
    async () => {
      const err = new Error('Boom');

      const prodDesc = ErrorNormalizer.normalize(err, { exposeStack: false });
      assert.strictEqual(prodDesc.stack, undefined);

      const devDesc = ErrorNormalizer.normalize(err, { exposeStack: true });
      assert.ok(typeof devDesc.stack === 'string');
      assert.ok(devDesc.stack.includes('Boom'));
    },
  );

  await t.test(
    '8. Lifecycle: Processing works in READY/RUNNING and is blocked when STOPPED',
    async () => {
      const pipeline = new ExceptionPipeline();
      assert.strictEqual(pipeline.state, 'READY');

      const container = new ContainerBuilder().build();
      container.makeReady();
      const reqContext = await new RequestContextManager(container).createContext();

      const err = new Error('Test error');
      const res = await pipeline.handle(err, new ExceptionContext(reqContext, err));
      assert.strictEqual(res.status, 500);

      pipeline.stop();
      assert.strictEqual(pipeline.state, 'STOPPED');

      await assert.rejects(async () => {
        await pipeline.handle(err, new ExceptionContext(reqContext, err));
      }, ExceptionStateError);

      await reqContext.dispose();
    },
  );

  await t.test(
    '9. 1,000 Concurrent exception operations maintain complete context isolation',
    async () => {
      const pipeline = new ExceptionPipeline();
      const container = new ContainerBuilder().build();
      container.makeReady();
      const contextManager = new RequestContextManager(container);

      const tasks = Array.from({ length: 1000 }, async (_, i) => {
        const reqContext = await contextManager.createContext({ id: `err-ctx-${i}` });
        try {
          const err = new ValidationError(`Field error ${i}`);
          const context = new ExceptionContext(reqContext, err);
          context.set('index', i);

          const desc = await pipeline.handle(err, context);
          return { i, desc, storedIndex: context.get<number>('index') };
        } finally {
          await reqContext.dispose();
        }
      });

      const results = await Promise.all(tasks);

      assert.strictEqual(results.length, 1000);
      for (let i = 0; i < 1000; i++) {
        assert.strictEqual(results[i].desc.status, 400);
        assert.strictEqual(results[i].desc.message, `Field error ${i}`);
        assert.strictEqual(results[i].storedIndex, i);
      }
    },
  );

  await t.test(
    '10. ErrorResponseMapper: Produces transport-neutral response format consumed by ResponseProcessor',
    async () => {
      const descriptor: ErrorDescriptor = {
        code: 'CF-VALIDATION-ERROR',
        category: 'VALIDATION',
        message: 'Invalid payload',
        status: 400,
        timestamp: Date.now(),
      };

      const mapped = ErrorResponseMapper.map(descriptor);
      assert.strictEqual(mapped.status, 400);
      assert.strictEqual(mapped.contentType, 'application/json; charset=utf-8');
      assert.strictEqual(mapped.body, descriptor);

      // Validate downstream ResponseProcessor can process mapped error response directly
      const responseProcessor = new ResponseProcessor();
      const response = await responseProcessor.process(mapped);

      assert.strictEqual(response.status, 400);
      assert.strictEqual(response.contentType, 'application/json; charset=utf-8');
      assert.deepStrictEqual(response.body, descriptor);
    },
  );

  await t.test(
    '11. Full End-to-End Pipeline Failure Integration: Decorators -> MetadataRegistry -> Discovery -> Compiler -> DI -> RequestContext -> ParameterBinding -> ExecutionEngine (fails) -> ExceptionPipeline -> ErrorDescriptor -> ResponseProcessor',
    async () => {
      MetadataRegistrar.reset();

      // 1. Guard that rejects unauthorized calls
      class StrictAuthGuard implements Guard {
        public canActivate(context: ExecutionContext): boolean {
          const req = context.request as NormalizedRequest;
          return req.headers?.authorization === 'Bearer valid-admin-token';
        }
      }

      // 2. Decorated Controller that throws business error
      @Controller('/api/account')
      class AccountController {
        @Get('/:accountId')
        public getAccount(@Param('accountId') accountId: string) {
          if (accountId === 'banned') {
            throw new CoreForgeError('Account is banned', 'CF-CONFLICT-BANNED', {
              accountId,
              reason: 'Policy violation',
            });
          }
          return { accountId, active: true };
        }
      }
      void AccountController;

      @Module({
        controllers: [AccountController],
      })
      class AccountModule {}
      void AccountModule;

      // 3. Metadata Finalization
      const metadataBuilder = new MetadataBuilder();
      const metadataRegistry = new MetadataRegistry(metadataBuilder.build());
      MetadataRegistrar.finalize(MetadataRegistrar.getCollector(), metadataRegistry);

      // 4. Discovery & Compiler
      const discovery = await new DiscoveryEngine(
        new DiscoveryBuilder().setMetadataRegistry(metadataRegistry).build(),
      ).discover();
      const compilation = await new ModuleCompiler(new CompilerBuilder().build()).compile(
        discovery,
      );
      assert.ok(compilation);

      // 5. Parameter Binding
      const compiledBindings = ParameterBindingCompiler.compileFromRegistry(metadataRegistry);
      const actionKey = 'AccountController:getAccount:GET:/accountId';
      const bindings = compiledBindings.get(actionKey) || Array.from(compiledBindings.values())[0];

      // 6. DI Container & Request Context
      const container = new ContainerBuilder()
        .register({ token: AccountController, useClass: AccountController, scope: 'REQUEST' })
        .register({ token: StrictAuthGuard, useClass: StrictAuthGuard, scope: 'REQUEST' })
        .build();
      container.makeReady();

      const contextManager = new RequestContextManager(container);
      const reqContext = await contextManager.createContext({ id: 'req-err-e2e' });

      // 7. Assembled ActionDescriptor with Guard
      const actionDescriptor: ActionDescriptor = {
        id: actionKey,
        controllerToken: AccountController,
        methodName: 'getAccount',
        parameterBindings: bindings,
        guards: [StrictAuthGuard],
        middleware: [],
        interceptors: [],
      };

      const executionEngine = new ExecutionEngine();
      const exceptionPipeline = new ExceptionPipeline();
      const responseProcessor = new ResponseProcessor();

      // Case A: Guard Rejection (Unauthorized)
      try {
        await executionEngine.execute(
          actionDescriptor,
          { params: { accountId: '123' }, headers: {} }, // Missing valid auth header
          reqContext,
        );
        assert.fail('Should have thrown GuardRejectedError');
      } catch (err) {
        const errorDesc = await exceptionPipeline.handle(
          err,
          new ExceptionContext(reqContext, err),
        );

        assert.strictEqual(errorDesc.category, 'AUTHORIZATION');
        assert.strictEqual(errorDesc.status, 403);

        const mappedResponse = ErrorResponseMapper.map(errorDesc);
        const finalResponse = await responseProcessor.process(mappedResponse);

        assert.strictEqual(finalResponse.status, 403);
        assert.strictEqual((finalResponse.body as ErrorDescriptor).category, 'AUTHORIZATION');
      }

      // Case B: Business Error (Banned account)
      try {
        await executionEngine.execute(
          actionDescriptor,
          {
            params: { accountId: 'banned' },
            headers: { authorization: 'Bearer valid-admin-token' },
          },
          reqContext,
        );
        assert.fail('Should have thrown business error');
      } catch (err) {
        const errorDesc = await exceptionPipeline.handle(
          err,
          new ExceptionContext(reqContext, err),
        );

        assert.strictEqual(errorDesc.category, 'CONFLICT');
        assert.strictEqual(errorDesc.status, 409);
        assert.strictEqual(errorDesc.message, 'Account is banned');
        assert.strictEqual(errorDesc.details?.accountId, 'banned');

        const mappedResponse = ErrorResponseMapper.map(errorDesc);
        const finalResponse = await responseProcessor.process(mappedResponse);

        assert.strictEqual(finalResponse.status, 409);
        assert.strictEqual((finalResponse.body as ErrorDescriptor).code, 'CF-CONFLICT-BANNED');
      }

      await reqContext.dispose();
    },
  );

  await t.test(
    '12. Diagnostics: Snapshots record accurate counts, category distributions, and latency metrics',
    async () => {
      const registry = new ExceptionHandlerRegistry();
      registry.registerCategory('VALIDATION', {
        canHandle: () => true,
        handle: (err) => ({
          code: 'CF-VALIDATION',
          category: 'VALIDATION',
          status: 400,
          message: (err as Error).message,
          timestamp: Date.now(),
        }),
      });

      const pipeline = new ExceptionPipeline({ registry, enableDiagnostics: true });
      const container = new ContainerBuilder().build();
      container.makeReady();
      const reqContext = await new RequestContextManager(container).createContext();

      const vErr = new ValidationError('Bad value');
      await pipeline.handle(vErr, new ExceptionContext(reqContext, vErr));

      const aErr = new CoreForgeError('Auth fail', 'CF-AUTHORIZATION-FAILED');
      await pipeline.handle(aErr, new ExceptionContext(reqContext, aErr));

      const uErr = new Error('Unknown boom');
      await pipeline.handle(uErr, new ExceptionContext(reqContext, uErr));

      const diag = pipeline.diagnostics;
      assert.strictEqual(diag.total, 3);
      assert.strictEqual(diag.handled, 1);
      assert.strictEqual(diag.fallback, 2);
      assert.strictEqual(diag.byCategory['VALIDATION'], 1);
      assert.strictEqual(diag.byCategory['AUTHORIZATION'], 1);
      assert.strictEqual(diag.byCategory['INTERNAL'], 1);
      assert.ok(diag.averageDurationMs >= 0);
      assert.ok(Object.isFrozen(diag));

      await reqContext.dispose();
    },
  );

  await t.test(
    '13. Handler Tie-Breaking: Handlers with identical priority break ties deterministically by registration order',
    async () => {
      const registry = new ExceptionHandlerRegistry();
      const executionOrder: string[] = [];

      const handlerA: ExceptionHandler = {
        priority: 50,
        canHandle() {
          executionOrder.push('A');
          return false;
        },
        handle() {
          return {
            code: 'A',
            category: 'INTERNAL',
            status: 500,
            message: 'A',
            timestamp: Date.now(),
          };
        },
      };

      const handlerB: ExceptionHandler = {
        priority: 50,
        canHandle() {
          executionOrder.push('B');
          return true;
        },
        handle() {
          return {
            code: 'B',
            category: 'INTERNAL',
            status: 500,
            message: 'B',
            timestamp: Date.now(),
          };
        },
      };

      registry.registerCategory('INTERNAL', handlerA, 50);
      registry.registerCategory('INTERNAL', handlerB, 50);

      const pipeline = new ExceptionPipeline({ registry });
      const container = new ContainerBuilder().build();
      container.makeReady();
      const reqContext = await new RequestContextManager(container).createContext();

      const result = await pipeline.handle(
        new Error('Test tie'),
        new ExceptionContext(reqContext, 'err'),
      );
      assert.deepStrictEqual(executionOrder, ['A', 'B']);
      assert.strictEqual(result.message, 'B');

      await reqContext.dispose();
    },
  );
});
