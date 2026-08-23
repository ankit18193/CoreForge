import * as assert from 'node:assert';
import { test } from 'node:test';

import { CompilerBuilder, ModuleCompiler } from '@coreforge/compiler';
import {
  Body,
  Controller,
  Get,
  Header,
  MetadataRegistrar,
  Module,
  Param,
  Post,
  Query,
} from '@coreforge/decorators';
import { ContainerBuilder } from '@coreforge/di';
import { DiscoveryBuilder, DiscoveryEngine } from '@coreforge/discovery';
import {
  ActionDescriptor,
  ExecutionContext,
  ExecutionEngine,
  Guard,
  Interceptor,
  Middleware,
} from '@coreforge/execution';
import { MetadataBuilder, MetadataRegistry } from '@coreforge/metadata';
import { NormalizedRequest, ParameterBindingCompiler } from '@coreforge/parameter-binding';
import { RequestContextManager } from '@coreforge/request-context';

import {
  CircularResponseError,
  InvalidResponseHeaderError,
  InvalidResponseStatusError,
  ResponseDescriptor,
  ResponseHeaders,
  ResponseProcessor,
  ResponseStateError,
} from '../index';

test('CoreForge Response Processing & Result Serialization Engine (@coreforge/response)', async (t) => {
  await t.test('1. Result Normalization: undefined produces 204 No Content', async () => {
    const processor = new ResponseProcessor();
    const response = await processor.process(undefined);

    assert.strictEqual(response.status, 204);
    assert.strictEqual(response.body, undefined);
    assert.strictEqual(response.contentType, undefined);
    assert.deepStrictEqual(response.headers.values, {});
  });

  await t.test(
    '2. Result Normalization: null produces 200 with null body and application/json',
    async () => {
      const processor = new ResponseProcessor();
      const response = await processor.process(null);

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body, null);
      assert.strictEqual(response.contentType, 'application/json');
    },
  );

  await t.test(
    '3. Result Normalization: string produces 200 with text/plain; charset=utf-8',
    async () => {
      const processor = new ResponseProcessor();
      const response = await processor.process('Hello, CoreForge!');

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body, 'Hello, CoreForge!');
      assert.strictEqual(response.contentType, 'text/plain; charset=utf-8');
    },
  );

  await t.test(
    '4. Result Normalization: primitives (number, boolean, bigint) preserve values and assign application/json',
    async () => {
      const processor = new ResponseProcessor();

      const numRes = await processor.process(42);
      assert.strictEqual(numRes.status, 200);
      assert.strictEqual(numRes.body, 42);
      assert.strictEqual(numRes.contentType, 'application/json');

      const boolRes = await processor.process(true);
      assert.strictEqual(boolRes.status, 200);
      assert.strictEqual(boolRes.body, true);
      assert.strictEqual(boolRes.contentType, 'application/json');

      const bigIntRes = await processor.process(BigInt(9007199254740991));
      assert.strictEqual(bigIntRes.status, 200);
      assert.strictEqual(bigIntRes.body, '9007199254740991');
      assert.strictEqual(bigIntRes.contentType, 'application/json');
    },
  );

  await t.test(
    '5. Result Normalization: object and array results produce 200 with serialized JSON payload',
    async () => {
      const processor = new ResponseProcessor();

      const objResult = { id: 'usr-1', name: 'Alice', active: true };
      const objRes = await processor.process(objResult);
      assert.strictEqual(objRes.status, 200);
      assert.deepStrictEqual(objRes.body, { id: 'usr-1', name: 'Alice', active: true });
      assert.strictEqual(objRes.contentType, 'application/json');

      const arrResult = [1, 'two', { three: 3 }];
      const arrRes = await processor.process(arrResult);
      assert.strictEqual(arrRes.status, 200);
      assert.deepStrictEqual(arrRes.body, [1, 'two', { three: 3 }]);
      assert.strictEqual(arrRes.contentType, 'application/json');
    },
  );

  await t.test(
    '6. Result Normalization: explicit ResponseDescriptor preserves custom status, headers, and body',
    async () => {
      const processor = new ResponseProcessor();

      const customDescriptor = new ResponseDescriptor({
        status: 201,
        headers: { 'x-custom-header': 'custom-value' },
        contentType: 'application/problem+json',
        body: { created: true, id: 100 },
      });

      const response = await processor.process(customDescriptor);

      assert.strictEqual(response.status, 201);
      assert.strictEqual(response.contentType, 'application/problem+json');
      assert.strictEqual(response.headers.values['x-custom-header'], 'custom-value');
      assert.deepStrictEqual(response.body, { created: true, id: 100 });
    },
  );

  await t.test(
    '7. Serialization: Objects and arrays serialize safely without mutating source objects',
    async () => {
      const processor = new ResponseProcessor();

      const originalDate = new Date('2026-08-23T12:00:00.000Z');
      const originalObj = {
        title: 'CoreForge Architecture',
        createdAt: originalDate,
        tags: ['framework', 'di', 'pipeline'],
        author: {
          name: 'Developer',
          meta: { version: 1 },
        },
        ignoredFunction: () => 'omit-me',
        ignoredSymbol: Symbol('sym'),
      };

      const originalClone = JSON.parse(
        JSON.stringify({ ...originalObj, createdAt: originalDate.toISOString() }),
      );

      const response = await processor.process(originalObj);

      assert.deepStrictEqual(response.body, {
        title: 'CoreForge Architecture',
        createdAt: '2026-08-23T12:00:00.000Z',
        tags: ['framework', 'di', 'pipeline'],
        author: {
          name: 'Developer',
          meta: { version: 1 },
        },
      });

      // Verify original object was NOT mutated
      assert.strictEqual(originalObj.title, originalClone.title);
      assert.strictEqual(originalObj.createdAt, originalDate);
      assert.strictEqual(typeof originalObj.ignoredFunction, 'function');
    },
  );

  await t.test(
    '8. Serialization: Circular reference detection rejects cyclic structures with deterministic error and path',
    async () => {
      const processor = new ResponseProcessor();

      // Direct circular reference
      const cyclicObj: Record<string, unknown> = { name: 'Root' };
      cyclicObj.self = cyclicObj;

      await assert.rejects(
        async () => {
          await processor.process(cyclicObj);
        },
        (err: unknown) => {
          assert.ok(err instanceof CircularResponseError);
          assert.ok(err.circularPath.includes('body.self → body'));
          return true;
        },
      );

      // Deep nested circular reference
      const nodeA: Record<string, unknown> = { id: 'A' };
      const nodeB: Record<string, unknown> = { id: 'B', parent: nodeA };
      const nodeC: Record<string, unknown> = { id: 'C', next: nodeB };
      nodeA.child = nodeC;

      await assert.rejects(
        async () => {
          await processor.process(nodeA);
        },
        (err: unknown) => {
          assert.ok(err instanceof CircularResponseError);
          assert.ok(err.circularPath.includes('body.child.next.parent → body'));
          return true;
        },
      );
    },
  );

  await t.test(
    '9. Headers: Case-insensitive retrieval, multi-value array support, and validation',
    async () => {
      const headers = new ResponseHeaders({
        'Content-Type': 'application/json',
        'X-API-VERSION': '1.0',
        'Set-Cookie': ['cookie1=val1', 'cookie2=val2'],
      });

      assert.strictEqual(headers.get('content-type'), 'application/json');
      assert.strictEqual(headers.get('CONTENT-TYPE'), 'application/json');
      assert.strictEqual(headers.get('x-api-version'), '1.0');
      assert.deepStrictEqual(headers.get('set-cookie'), ['cookie1=val1', 'cookie2=val2']);
      assert.strictEqual(headers.has('X-Api-Version'), true);

      // Invalid header names
      assert.throws(() => {
        headers.set('', 'val');
      }, InvalidResponseHeaderError);

      assert.throws(() => {
        headers.set('   ', 'val');
      }, InvalidResponseHeaderError);

      assert.throws(() => {
        headers.set('Header\r\nInjected', 'val');
      }, InvalidResponseHeaderError);

      // Invalid header values
      assert.throws(() => {
        headers.set('X-Test', 'Value\r\nInjected');
      }, InvalidResponseHeaderError);

      assert.throws(() => {
        headers.set('X-Test', { invalid: 'object' } as never);
      }, InvalidResponseHeaderError);
    },
  );

  await t.test(
    '10. Status Code: Valid range (100-599) accepted, invalid values rejected',
    async () => {
      // Valid statuses
      const valid100 = new ResponseDescriptor({ status: 100, body: null });
      assert.strictEqual(valid100.status, 100);

      const valid200 = new ResponseDescriptor({ status: 200, body: 'ok' });
      assert.strictEqual(valid200.status, 200);

      const valid599 = new ResponseDescriptor({ status: 599, body: 'error' });
      assert.strictEqual(valid599.status, 599);

      // Invalid statuses
      assert.throws(() => {
        new ResponseDescriptor({ status: 99, body: 'invalid' });
      }, InvalidResponseStatusError);

      assert.throws(() => {
        new ResponseDescriptor({ status: 600, body: 'invalid' });
      }, InvalidResponseStatusError);

      assert.throws(() => {
        new ResponseDescriptor({ status: 200.5, body: 'invalid' });
      }, InvalidResponseStatusError);

      assert.throws(() => {
        new ResponseDescriptor({ status: NaN, body: 'invalid' });
      }, InvalidResponseStatusError);
    },
  );

  await t.test('11. Async Resolution: Resolves Promise results seamlessly', async () => {
    const processor = new ResponseProcessor();

    const asyncPromise = Promise.resolve({ success: true, count: 42 });
    const response = await processor.process(asyncPromise);

    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(response.body, { success: true, count: 42 });
    assert.strictEqual(response.contentType, 'application/json');
  });

  await t.test(
    '12. Concurrency: 1,000 concurrent response processing operations maintain complete isolation',
    async () => {
      const processor = new ResponseProcessor();

      const tasks = Array.from({ length: 1000 }, async (_, i) => {
        const payload = {
          requestId: `req-${i}`,
          index: i,
          timestamp: new Date('2026-08-23T00:00:00.000Z'),
          nested: {
            items: [i * 1, i * 2, i * 3],
          },
        };

        const res = await processor.process(payload);
        return { i, res };
      });

      const results = await Promise.all(tasks);

      assert.strictEqual(results.length, 1000);
      for (let i = 0; i < 1000; i++) {
        const body = results[i].res.body as {
          requestId: string;
          index: number;
          timestamp: string;
          nested: { items: number[] };
        };
        assert.strictEqual(body.requestId, `req-${i}`);
        assert.strictEqual(body.index, i);
        assert.strictEqual(body.timestamp, '2026-08-23T00:00:00.000Z');
        assert.deepStrictEqual(body.nested.items, [i * 1, i * 2, i * 3]);
      }
    },
  );

  await t.test(
    '13. Lifecycle: Processing functions in READY/RUNNING and is rejected after STOPPED',
    async () => {
      const processor = new ResponseProcessor();
      assert.strictEqual(processor.state, 'READY');

      const readyRes = await processor.process({ state: 'ready' });
      assert.strictEqual(readyRes.status, 200);

      processor.start();
      assert.strictEqual(processor.state, 'RUNNING');

      const runningRes = await processor.process({ state: 'running' });
      assert.strictEqual(runningRes.status, 200);

      processor.stop();
      assert.strictEqual(processor.state, 'STOPPED');

      await assert.rejects(async () => {
        await processor.process({ state: 'stopped' });
      }, ResponseStateError);
    },
  );

  await t.test(
    '14. Diagnostics: Snapshots record counts, durations, and status distributions without leaking payloads',
    async () => {
      const processor = new ResponseProcessor({ enableDiagnostics: true });

      await processor.process({ id: 1 }); // 200
      await processor.process(undefined); // 204
      await processor.process('text'); // 200

      // Circular failure
      const cycle: Record<string, unknown> = { val: 'test' };
      cycle.self = cycle;
      try {
        await processor.process(cycle);
      } catch {
        // Expected
      }

      const diag = processor.diagnostics;

      assert.strictEqual(diag.totalProcessed, 4);
      assert.strictEqual(diag.successfulProcessed, 3);
      assert.strictEqual(diag.circularFailures, 1);
      assert.strictEqual(diag.serializationFailures, 1);
      assert.ok(diag.totalDurationMs >= 0);
      assert.strictEqual(diag.statusDistribution[200], 2);
      assert.strictEqual(diag.statusDistribution[204], 1);
      assert.ok(Object.isFrozen(diag));
    },
  );

  await t.test(
    '15. Full End-to-End Integration: Decorators -> MetadataRegistry -> Discovery -> Compiler -> DI -> RequestContext -> ParameterBinding -> Execution -> ResponseProcessor -> ResponseDescriptor',
    async () => {
      MetadataRegistrar.reset();

      // 1. Pipeline components
      class SecurityGuard implements Guard {
        public canActivate(context: ExecutionContext): boolean {
          const req = context.request as NormalizedRequest;
          return req.headers?.['authorization'] === 'Bearer secret-jwt';
        }
      }

      class LoggingMiddleware implements Middleware {
        public async handle(
          context: ExecutionContext,
          next: () => Promise<unknown>,
        ): Promise<unknown> {
          const result = await next();
          return {
            result,
            meta: {
              requestId: context.requestContext.id,
              processedAt: new Date('2026-08-23T15:30:00.000Z'),
            },
          };
        }
      }

      class EnvelopingInterceptor implements Interceptor {
        public async intercept(
          _context: ExecutionContext,
          next: () => Promise<unknown>,
        ): Promise<unknown> {
          const inner = await next();
          return inner;
        }
      }

      // 2. Controller with Decorators
      @Controller('/api/users')
      class UserApiController {
        @Get('/:userId')
        public getUser(
          @Param('userId') userId: string,
          @Query('fields', { required: false }) fields: string,
          @Header('authorization') auth: string,
        ) {
          return {
            userId,
            username: `user_${userId}`,
            requestedFields: fields || 'all',
            authVerified: Boolean(auth),
            registeredAt: new Date('2026-01-01T00:00:00.000Z'),
          };
        }

        @Post('/create')
        public createUser(@Body('name') name: string) {
          return { id: 'usr-new', name, status: 'CREATED' };
        }
      }
      void UserApiController;

      @Module({
        controllers: [UserApiController],
      })
      class UserApiModule {}
      void UserApiModule;

      // 3. Authoritative MetadataRegistry & Finalization
      const metadataBuilder = new MetadataBuilder();
      const metadataRegistry = new MetadataRegistry(metadataBuilder.build());
      MetadataRegistrar.finalize(MetadataRegistrar.getCollector(), metadataRegistry);

      // 4. Discovery & Compiler
      const discoveryBuilder = new DiscoveryBuilder().setMetadataRegistry(metadataRegistry);
      const discovery = await new DiscoveryEngine(discoveryBuilder.build()).discover();
      const compilation = await new ModuleCompiler(new CompilerBuilder().build()).compile(
        discovery,
      );
      assert.ok(compilation);

      // 5. Parameter Binding Compilation
      const compiledBindings = ParameterBindingCompiler.compileFromRegistry(metadataRegistry);
      const actionKey = 'UserApiController:getUser:GET:/userId';
      const bindings = compiledBindings.get(actionKey) || Array.from(compiledBindings.values())[0];
      assert.ok(bindings);

      // 6. DI Container & Request Context
      const container = new ContainerBuilder()
        .register({ token: UserApiController, useClass: UserApiController, scope: 'REQUEST' })
        .register({ token: SecurityGuard, useClass: SecurityGuard, scope: 'REQUEST' })
        .register({ token: LoggingMiddleware, useClass: LoggingMiddleware, scope: 'REQUEST' })
        .register({
          token: EnvelopingInterceptor,
          useClass: EnvelopingInterceptor,
          scope: 'REQUEST',
        })
        .build();
      container.makeReady();

      const contextManager = new RequestContextManager(container);
      const reqContext = await contextManager.createContext({ id: 'req-e2e-500' });

      // 7. Action Execution Descriptor
      const actionDescriptor: ActionDescriptor = {
        id: actionKey,
        controllerToken: UserApiController,
        methodName: 'getUser',
        parameterBindings: bindings,
        guards: [SecurityGuard],
        middleware: [LoggingMiddleware],
        interceptors: [EnvelopingInterceptor],
      };

      // 8. Execute via ExecutionEngine
      const executionEngine = new ExecutionEngine();
      const incomingRequest: NormalizedRequest = {
        params: { userId: '777' },
        query: { fields: 'summary' },
        headers: { authorization: 'Bearer secret-jwt' },
      };

      const rawResult = await executionEngine.execute(
        actionDescriptor,
        incomingRequest,
        reqContext,
      );

      // 9. Process Response via ResponseProcessor
      const responseProcessor = new ResponseProcessor();
      const responseDescriptor = await responseProcessor.process(rawResult);

      // 10. Verify Normalized ResponseDescriptor
      assert.strictEqual(responseDescriptor.status, 200);
      assert.strictEqual(responseDescriptor.contentType, 'application/json');

      const body = responseDescriptor.body as {
        result: {
          userId: string;
          username: string;
          requestedFields: string;
          authVerified: boolean;
          registeredAt: string;
        };
        meta: {
          requestId: string;
          processedAt: string;
        };
      };

      assert.strictEqual(body.result.userId, '777');
      assert.strictEqual(body.result.username, 'user_777');
      assert.strictEqual(body.result.requestedFields, 'summary');
      assert.strictEqual(body.result.authVerified, true);
      assert.strictEqual(body.result.registeredAt, '2026-01-01T00:00:00.000Z');
      assert.strictEqual(body.meta.requestId, 'req-e2e-500');
      assert.strictEqual(body.meta.processedAt, '2026-08-23T15:30:00.000Z');

      await reqContext.dispose();
    },
  );
});
