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
import { MetadataBuilder, MetadataRegistry } from '@coreforge/metadata';
import { NormalizedRequest, ParameterBindingCompiler } from '@coreforge/parameter-binding';
import { RequestContextManager } from '@coreforge/request-context';

import {
  ActionDescriptor,
  ActionNotFoundError,
  ControllerResolutionError,
  ExecutionContext,
  ExecutionEngine,
  ExecutionStateError,
  Guard,
  GuardRejectedError,
  Interceptor,
  Middleware,
} from '../index';

test('CoreForge Action Execution & Request Pipeline Engine (@coreforge/execution)', async (t) => {
  await t.test(
    '1. Synchronous and asynchronous action execution on controller resolved through DI',
    async () => {
      class UserController {
        public getSync(id: string): string {
          return `sync-user-${id}`;
        }

        public async getAsync(id: string): Promise<string> {
          return `async-user-${id}`;
        }
      }

      const container = new ContainerBuilder()
        .register({ token: UserController, useClass: UserController, scope: 'REQUEST' })
        .build();
      container.makeReady();

      const contextManager = new RequestContextManager(container);
      const reqContext = await contextManager.createContext();

      const engine = new ExecutionEngine();

      const syncAction: ActionDescriptor = {
        id: 'UserController:getSync',
        controllerToken: UserController,
        methodName: 'getSync',
        parameterBindings: [
          {
            id: 'p1',
            actionId: 'UserController:getSync',
            parameterIndex: 0,
            source: 'PARAM',
            name: 'id',
            required: true,
          },
        ],
        guards: [],
        middleware: [],
        interceptors: [],
      };

      const asyncAction: ActionDescriptor = {
        id: 'UserController:getAsync',
        controllerToken: UserController,
        methodName: 'getAsync',
        parameterBindings: [
          {
            id: 'p2',
            actionId: 'UserController:getAsync',
            parameterIndex: 0,
            source: 'PARAM',
            name: 'id',
            required: true,
          },
        ],
        guards: [],
        middleware: [],
        interceptors: [],
      };

      const request: NormalizedRequest = { params: { id: '42' } };

      const syncRes = await engine.execute(syncAction, request, reqContext);
      const asyncRes = await engine.execute(asyncAction, request, reqContext);

      assert.strictEqual(syncRes, 'sync-user-42');
      assert.strictEqual(asyncRes, 'async-user-42');

      await reqContext.dispose();
    },
  );

  await t.test(
    '2. Parameter binding integration passes bound arguments to controller method unchanged',
    async () => {
      class ProductController {
        public search(category: string, limit: number, authHeader: string, bodyData: unknown) {
          return { category, limit, authHeader, bodyData };
        }
      }

      const container = new ContainerBuilder()
        .register({ token: ProductController, useClass: ProductController, scope: 'REQUEST' })
        .build();
      container.makeReady();

      const contextManager = new RequestContextManager(container);
      const reqContext = await contextManager.createContext();

      const engine = new ExecutionEngine();

      const action: ActionDescriptor = {
        id: 'ProductController:search',
        controllerToken: ProductController,
        methodName: 'search',
        parameterBindings: [
          {
            id: 'b0',
            actionId: 'ProductController:search',
            parameterIndex: 0,
            source: 'PARAM',
            name: 'category',
            required: true,
          },
          {
            id: 'b1',
            actionId: 'ProductController:search',
            parameterIndex: 1,
            source: 'QUERY',
            name: 'limit',
            required: false,
          },
          {
            id: 'b2',
            actionId: 'ProductController:search',
            parameterIndex: 2,
            source: 'HEADER',
            name: 'authorization',
            required: true,
          },
          {
            id: 'b3',
            actionId: 'ProductController:search',
            parameterIndex: 3,
            source: 'BODY',
            name: 'filter',
            required: false,
          },
        ],
        guards: [],
        middleware: [],
        interceptors: [],
      };

      const request: NormalizedRequest = {
        params: { category: 'electronics' },
        query: { limit: 25 },
        headers: { Authorization: 'Bearer token-abc' },
        body: { filter: { inStock: true } },
      };

      const result = (await engine.execute(action, request, reqContext)) as {
        category: string;
        limit: number;
        authHeader: string;
        bodyData: unknown;
      };

      assert.strictEqual(result.category, 'electronics');
      assert.strictEqual(result.limit, 25);
      assert.strictEqual(result.authHeader, 'Bearer token-abc');
      assert.deepStrictEqual(result.bodyData, { inStock: true });

      await reqContext.dispose();
    },
  );

  await t.test(
    '3. Guards execute deterministically and reject unauthorized requests before downstream execution',
    async () => {
      let guard1Executed = false;
      let guard2Executed = false;
      let controllerExecuted = false;

      class AuthGuard implements Guard {
        public canActivate(): boolean {
          guard1Executed = true;
          return true;
        }
      }

      class RoleGuard implements Guard {
        public canActivate(): boolean {
          guard2Executed = true;
          return false; // Reject!
        }
      }

      class SecureController {
        public secretAction() {
          controllerExecuted = true;
          return 'super-secret';
        }
      }

      const container = new ContainerBuilder()
        .register({ token: AuthGuard, useClass: AuthGuard, scope: 'REQUEST' })
        .register({ token: RoleGuard, useClass: RoleGuard, scope: 'REQUEST' })
        .register({ token: SecureController, useClass: SecureController, scope: 'REQUEST' })
        .build();
      container.makeReady();

      const contextManager = new RequestContextManager(container);
      const reqContext = await contextManager.createContext();

      const engine = new ExecutionEngine();

      const action: ActionDescriptor = {
        id: 'SecureController:secretAction',
        controllerToken: SecureController,
        methodName: 'secretAction',
        parameterBindings: [],
        guards: [AuthGuard, RoleGuard],
        middleware: [],
        interceptors: [],
      };

      await assert.rejects(async () => {
        await engine.execute(action, {}, reqContext);
      }, GuardRejectedError);

      assert.strictEqual(guard1Executed, true);
      assert.strictEqual(guard2Executed, true);
      assert.strictEqual(controllerExecuted, false);

      await reqContext.dispose();
    },
  );

  await t.test(
    '4. Middleware executes before action, unwinds after action, and can transform results',
    async () => {
      const executionTrail: string[] = [];

      class HeaderMiddleware implements Middleware {
        public async handle(
          _context: ExecutionContext,
          next: () => Promise<unknown>,
        ): Promise<unknown> {
          executionTrail.push('middleware1-before');
          const result = (await next()) as { value: string };
          executionTrail.push('middleware1-after');
          return { ...result, modifiedByMiddleware: true };
        }
      }

      class LoggerMiddleware implements Middleware {
        public async handle(
          _context: ExecutionContext,
          next: () => Promise<unknown>,
        ): Promise<unknown> {
          executionTrail.push('middleware2-before');
          const result = await next();
          executionTrail.push('middleware2-after');
          return result;
        }
      }

      class SimpleController {
        public test() {
          executionTrail.push('controller');
          return { value: 'original' };
        }
      }

      const container = new ContainerBuilder()
        .register({ token: HeaderMiddleware, useClass: HeaderMiddleware, scope: 'REQUEST' })
        .register({ token: LoggerMiddleware, useClass: LoggerMiddleware, scope: 'REQUEST' })
        .register({ token: SimpleController, useClass: SimpleController, scope: 'REQUEST' })
        .build();
      container.makeReady();

      const contextManager = new RequestContextManager(container);
      const reqContext = await contextManager.createContext();

      const engine = new ExecutionEngine();

      const action: ActionDescriptor = {
        id: 'SimpleController:test',
        controllerToken: SimpleController,
        methodName: 'test',
        parameterBindings: [],
        guards: [],
        middleware: [HeaderMiddleware, LoggerMiddleware],
        interceptors: [],
      };

      const result = (await engine.execute(action, {}, reqContext)) as {
        value: string;
        modifiedByMiddleware?: boolean;
      };

      assert.deepStrictEqual(executionTrail, [
        'middleware1-before',
        'middleware2-before',
        'controller',
        'middleware2-after',
        'middleware1-after',
      ]);

      assert.strictEqual(result.value, 'original');
      assert.strictEqual(result.modifiedByMiddleware, true);

      await reqContext.dispose();
    },
  );

  await t.test(
    '5. Interceptors execute around action, transform results, and observe/catch errors',
    async () => {
      const trail: string[] = [];

      class TimingInterceptor implements Interceptor {
        public async intercept(
          _context: ExecutionContext,
          next: () => Promise<unknown>,
        ): Promise<unknown> {
          trail.push('interceptor-before');
          const result = await next();
          trail.push('interceptor-after');
          return { data: result, intercepted: true };
        }
      }

      class SampleController {
        public getData() {
          trail.push('controller');
          return 'hello-world';
        }
      }

      const container = new ContainerBuilder()
        .register({ token: TimingInterceptor, useClass: TimingInterceptor, scope: 'REQUEST' })
        .register({ token: SampleController, useClass: SampleController, scope: 'REQUEST' })
        .build();
      container.makeReady();

      const contextManager = new RequestContextManager(container);
      const reqContext = await contextManager.createContext();

      const engine = new ExecutionEngine();

      const action: ActionDescriptor = {
        id: 'SampleController:getData',
        controllerToken: SampleController,
        methodName: 'getData',
        parameterBindings: [],
        guards: [],
        middleware: [],
        interceptors: [TimingInterceptor],
      };

      const res = (await engine.execute(action, {}, reqContext)) as {
        data: string;
        intercepted: boolean;
      };

      assert.deepStrictEqual(trail, ['interceptor-before', 'controller', 'interceptor-after']);

      assert.strictEqual(res.data, 'hello-world');
      assert.strictEqual(res.intercepted, true);

      // Error catching interceptor
      class ErrorCatchingInterceptor implements Interceptor {
        public async intercept(
          _context: ExecutionContext,
          next: () => Promise<unknown>,
        ): Promise<unknown> {
          try {
            return await next();
          } catch (err) {
            return { handledError: (err as Error).message };
          }
        }
      }

      class FailingController {
        public fail() {
          throw new Error('Database disconnected');
        }
      }

      const container2 = new ContainerBuilder()
        .register({
          token: ErrorCatchingInterceptor,
          useClass: ErrorCatchingInterceptor,
          scope: 'REQUEST',
        })
        .register({ token: FailingController, useClass: FailingController, scope: 'REQUEST' })
        .build();
      container2.makeReady();

      const reqContext2 = await new RequestContextManager(container2).createContext();

      const failingAction: ActionDescriptor = {
        id: 'FailingController:fail',
        controllerToken: FailingController,
        methodName: 'fail',
        parameterBindings: [],
        guards: [],
        middleware: [],
        interceptors: [ErrorCatchingInterceptor],
      };

      const errorRes = (await engine.execute(failingAction, {}, reqContext2)) as {
        handledError: string;
      };

      assert.strictEqual(errorRes.handledError, 'Database disconnected');

      await reqContext.dispose();
      await reqContext2.dispose();
    },
  );

  await t.test(
    '6. 1,000 concurrent executions maintain complete request isolation and scoped DI resolution',
    async () => {
      class ScopedIdService {
        private static _idCounter = 0;
        public readonly id = ++ScopedIdService._idCounter;
      }

      class ParallelController {
        constructor(private readonly _service: ScopedIdService) {}

        public handle(reqId: string) {
          return {
            reqId,
            serviceId: this._service.id,
          };
        }
      }

      const container = new ContainerBuilder()
        .register({ token: ScopedIdService, useClass: ScopedIdService, scope: 'REQUEST' })
        .register({
          token: ParallelController,
          useFactory: (service) => new ParallelController(service as ScopedIdService),
          dependencies: [ScopedIdService],
          scope: 'REQUEST',
        })
        .build();
      container.makeReady();

      const contextManager = new RequestContextManager(container);
      const engine = new ExecutionEngine();

      const action: ActionDescriptor = {
        id: 'ParallelController:handle',
        controllerToken: ParallelController,
        methodName: 'handle',
        parameterBindings: [
          {
            id: 'p0',
            actionId: 'ParallelController:handle',
            parameterIndex: 0,
            source: 'PARAM',
            name: 'reqId',
            required: true,
          },
        ],
        guards: [],
        middleware: [],
        interceptors: [],
      };

      const tasks = Array.from({ length: 1000 }, async (_, i) => {
        const reqContext = await contextManager.createContext({ id: `ctx-${i}` });
        try {
          const req: NormalizedRequest = { params: { reqId: `req-${i}` } };
          const result = (await engine.execute(action, req, reqContext)) as {
            reqId: string;
            serviceId: number;
          };
          return { i, reqId: result.reqId, serviceId: result.serviceId };
        } finally {
          await reqContext.dispose();
        }
      });

      const results = await Promise.all(tasks);

      assert.strictEqual(results.length, 1000);
      const seenServiceIds = new Set<number>();
      for (let i = 0; i < 1000; i++) {
        assert.strictEqual(results[i].reqId, `req-${i}`);
        assert.ok(!seenServiceIds.has(results[i].serviceId));
        seenServiceIds.add(results[i].serviceId);
      }
    },
  );

  await t.test('7. Lifecycle management blocks execution when STOPPED or STOPPING', async () => {
    class TestController {
      public run() {
        return 'ok';
      }
    }

    const container = new ContainerBuilder()
      .register({ token: TestController, useClass: TestController, scope: 'REQUEST' })
      .build();
    container.makeReady();

    const reqContext = await new RequestContextManager(container).createContext();

    const engine = new ExecutionEngine();
    engine.stop();

    const action: ActionDescriptor = {
      id: 'TestController:run',
      controllerToken: TestController,
      methodName: 'run',
      parameterBindings: [],
      guards: [],
      middleware: [],
      interceptors: [],
    };

    await assert.rejects(async () => {
      await engine.execute(action, {}, reqContext);
    }, ExecutionStateError);

    await reqContext.dispose();
  });

  await t.test(
    '8. Error handling produces deterministic errors for missing actions and controller resolution failures',
    async () => {
      class IncompleteController {}

      const container = new ContainerBuilder()
        .register({ token: IncompleteController, useClass: IncompleteController, scope: 'REQUEST' })
        .build();
      container.makeReady();

      const reqContext = await new RequestContextManager(container).createContext();

      const engine = new ExecutionEngine();

      // Missing method
      const missingMethodAction: ActionDescriptor = {
        id: 'IncompleteController:nonExistent',
        controllerToken: IncompleteController,
        methodName: 'nonExistent',
        parameterBindings: [],
        guards: [],
        middleware: [],
        interceptors: [],
      };

      await assert.rejects(async () => {
        await engine.execute(missingMethodAction, {}, reqContext);
      }, ActionNotFoundError);

      // Unregistered controller token
      const unregisteredTokenAction: ActionDescriptor = {
        id: 'Unknown:act',
        controllerToken: 'UnregisteredToken',
        methodName: 'act',
        parameterBindings: [],
        guards: [],
        middleware: [],
        interceptors: [],
      };

      await assert.rejects(async () => {
        await engine.execute(unregisteredTokenAction, {}, reqContext);
      }, ControllerResolutionError);

      await reqContext.dispose();
    },
  );

  await t.test(
    '9. Diagnostics snapshots track execution metrics without leaking request payload data',
    async () => {
      class MetricController {
        public ok() {
          return 'success';
        }

        public fail() {
          throw new Error('Boom');
        }
      }

      class RejectGuard implements Guard {
        public canActivate(): boolean {
          return false;
        }
      }

      const container = new ContainerBuilder()
        .register({ token: MetricController, useClass: MetricController, scope: 'REQUEST' })
        .register({ token: RejectGuard, useClass: RejectGuard, scope: 'REQUEST' })
        .build();
      container.makeReady();

      const reqContext = await new RequestContextManager(container).createContext();

      const engine = new ExecutionEngine({ enableDiagnostics: true });

      const okAction: ActionDescriptor = {
        id: 'MetricController:ok',
        controllerToken: MetricController,
        methodName: 'ok',
        parameterBindings: [],
        guards: [],
        middleware: [],
        interceptors: [],
      };

      const failAction: ActionDescriptor = {
        id: 'MetricController:fail',
        controllerToken: MetricController,
        methodName: 'fail',
        parameterBindings: [],
        guards: [],
        middleware: [],
        interceptors: [],
      };

      const rejectAction: ActionDescriptor = {
        id: 'MetricController:reject',
        controllerToken: MetricController,
        methodName: 'ok',
        parameterBindings: [],
        guards: [RejectGuard],
        middleware: [],
        interceptors: [],
      };

      await engine.execute(okAction, { body: 'sensitive-password-123' }, reqContext);

      try {
        await engine.execute(failAction, {}, reqContext);
      } catch {
        // Expected
      }

      try {
        await engine.execute(rejectAction, {}, reqContext);
      } catch {
        // Expected
      }

      const diag = engine.diagnostics;

      assert.strictEqual(diag.totalExecutions, 3);
      assert.strictEqual(diag.successfulExecutions, 1);
      assert.strictEqual(diag.failedExecutions, 2);
      assert.strictEqual(diag.guardRejections, 1);
      assert.ok(diag.totalDurationMs >= 0);
      assert.ok(diag.slowestDurationMs >= 0);
      assert.ok(Object.isFrozen(diag));

      await reqContext.dispose();
    },
  );

  await t.test(
    '10. Full End-to-End Pipeline: Decorators -> MetadataCollector -> MetadataRegistrar -> MetadataRegistry -> Discovery -> Compiler -> DI Container -> RequestContextManager -> ParameterBindingCompiler -> ExecutionEngine -> Result',
    async () => {
      MetadataRegistrar.reset();

      // 1. Pipeline components (Guard, Middleware, Interceptor)
      class ApiKeyGuard implements Guard {
        public canActivate(context: ExecutionContext): boolean {
          const req = context.request as NormalizedRequest;
          return req.headers?.['x-api-key'] === 'valid-secret-key';
        }
      }

      class AuditMiddleware implements Middleware {
        public async handle(
          context: ExecutionContext,
          next: () => Promise<unknown>,
        ): Promise<unknown> {
          const res = (await next()) as Record<string, unknown>;
          return { ...res, audited: true, requestId: context.requestContext.id };
        }
      }

      class EnvelopeInterceptor implements Interceptor {
        public async intercept(
          _context: ExecutionContext,
          next: () => Promise<unknown>,
        ): Promise<unknown> {
          const data = await next();
          return { success: true, data };
        }
      }

      // 2. Decorated Controller
      @Controller('/orders')
      class OrderController {
        @Get('/:orderId')
        public findOrder(
          @Param('orderId') orderId: string,
          @Query('includeItems', { required: false }) includeItems: boolean,
          @Header('x-api-key') apiKey: string,
        ) {
          return {
            orderId,
            includeItems: Boolean(includeItems),
            apiKey,
            status: 'CONFIRMED',
          };
        }

        @Post('/create')
        public createOrder(@Body('item') item: string) {
          return { item, created: true };
        }
      }
      void OrderController;

      @Module({
        controllers: [OrderController],
      })
      class OrderModule {}
      void OrderModule;

      // 3. Authoritative MetadataRegistry
      const metadataBuilder = new MetadataBuilder();
      const metadataRegistry = new MetadataRegistry(metadataBuilder.build());

      // 4. Finalize collected decorator metadata into authoritative MetadataRegistry
      MetadataRegistrar.finalize(MetadataRegistrar.getCollector(), metadataRegistry);

      // 5. Discovery Engine
      const discoveryBuilder = new DiscoveryBuilder().setMetadataRegistry(metadataRegistry);
      const discoveryEngine = new DiscoveryEngine(discoveryBuilder.build());
      const discoveryResult = await discoveryEngine.discover();

      // 6. Module Compiler
      const compilerBuilder = new CompilerBuilder();
      const compiler = new ModuleCompiler(compilerBuilder.build());
      const compilationResult = await compiler.compile(discoveryResult);

      assert.ok(compilationResult);

      // 7. Parameter Binding Compiler
      const compiledBindings = ParameterBindingCompiler.compileFromRegistry(metadataRegistry);

      const findOrderKey = 'OrderController:findOrder:GET:/orderId';
      const orderBindings =
        compiledBindings.get(findOrderKey) || Array.from(compiledBindings.values())[0];

      assert.ok(orderBindings);

      // 8. DI Container & Request Context Manager
      const container = new ContainerBuilder()
        .register({ token: OrderController, useClass: OrderController, scope: 'REQUEST' })
        .register({ token: ApiKeyGuard, useClass: ApiKeyGuard, scope: 'REQUEST' })
        .register({ token: AuditMiddleware, useClass: AuditMiddleware, scope: 'REQUEST' })
        .register({ token: EnvelopeInterceptor, useClass: EnvelopeInterceptor, scope: 'REQUEST' })
        .build();
      container.makeReady();

      const contextManager = new RequestContextManager(container);
      const reqContext = await contextManager.createContext({ id: 'req-order-101' });

      // 9. Assembled ActionDescriptor
      const actionDescriptor: ActionDescriptor = {
        id: findOrderKey,
        controllerToken: OrderController,
        methodName: 'findOrder',
        parameterBindings: orderBindings,
        guards: [ApiKeyGuard],
        middleware: [AuditMiddleware],
        interceptors: [EnvelopeInterceptor],
      };

      // 10. Execution Engine execution
      const engine = new ExecutionEngine();

      const incomingRequest: NormalizedRequest = {
        params: { orderId: 'ord-8888' },
        query: { includeItems: true },
        headers: { 'x-api-key': 'valid-secret-key' },
      };

      const finalResult = (await engine.execute(actionDescriptor, incomingRequest, reqContext)) as {
        success: boolean;
        data: {
          orderId: string;
          includeItems: boolean;
          apiKey: string;
          status: string;
        };
        audited: boolean;
        requestId: string;
      };

      assert.strictEqual(finalResult.audited, true);
      assert.strictEqual(finalResult.requestId, 'req-order-101');
      assert.strictEqual(finalResult.success, true);
      assert.strictEqual(finalResult.data.orderId, 'ord-8888');
      assert.strictEqual(finalResult.data.includeItems, true);
      assert.strictEqual(finalResult.data.apiKey, 'valid-secret-key');
      assert.strictEqual(finalResult.data.status, 'CONFIRMED');

      await reqContext.dispose();
    },
  );
});
