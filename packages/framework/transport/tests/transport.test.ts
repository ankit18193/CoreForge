import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { test } from 'node:test';

import { CompilerBuilder, ModuleCompiler } from '@coreforge/compiler';
import { Controller, Get, MetadataRegistrar, Module, Param, Query } from '@coreforge/decorators';
import { ContainerBuilder } from '@coreforge/di';
import { DiscoveryBuilder, DiscoveryEngine } from '@coreforge/discovery';
import { ExceptionPipeline } from '@coreforge/exceptions';
import {
  ActionDescriptor,
  ActionExecutionEngine as ExecutionEngine,
  Guard,
  GuardRejectedError,
} from '@coreforge/execution';
import { MetadataBuilder, MetadataRegistry } from '@coreforge/metadata';
import { NormalizedRequest, ParameterBindingCompiler } from '@coreforge/parameter-binding';
import { RequestContext, RequestContextManager } from '@coreforge/request-context';
import { ResponseProcessor } from '@coreforge/response';

import {
  DefaultTransportRequestNormalizer,
  isNormalizedRequest,
  TransportAdapter,
  TransportAdapterError,
  TransportAdapterRegistry,
  TransportLifecycleManager,
  TransportPipeline,
  TransportResponseHeaders,
  TransportStateError,
} from '../index';
import { MockNativeResponse, MockTransportResponseWriter } from './MockTransportResponseWriter';

test('CoreForge Transport Adapter & HTTP Boundary Engine (@coreforge/transport)', async (t) => {
  await t.test(
    '1. Request Normalization: Normalizes method, path, headers, query, params, cookies, and preserves body',
    async () => {
      const normalizer = new DefaultTransportRequestNormalizer();
      const raw = {
        method: 'post',
        url: '/api/v1/users?page=2&filter=active',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-123',
          'X-Custom-Array': ['val1', 'val2'],
        },
        query: { page: '2', filter: 'active' },
        params: { id: '99' },
        cookies: { session: 'sess-abc' },
        body: { name: 'Alice', role: 'admin' },
      };

      const normalized = normalizer.normalize(raw);

      assert.strictEqual(normalized.method, 'POST');
      assert.strictEqual(normalized.path, '/api/v1/users');
      assert.strictEqual(normalized.headers?.['content-type'], 'application/json');
      assert.strictEqual(normalized.headers?.['authorization'], 'Bearer token-123');
      assert.deepStrictEqual(normalized.headers?.['x-custom-array'], ['val1', 'val2']);
      assert.strictEqual(normalized.query?.page, '2');
      assert.strictEqual(normalized.params?.id, '99');
      assert.strictEqual(normalized.cookies?.session, 'sess-abc');
      assert.deepStrictEqual(normalized.body, { name: 'Alice', role: 'admin' });
      assert.ok(isNormalizedRequest(normalized));
    },
  );

  await t.test(
    '2. Request Immutability: Normalization never mutates original raw request object',
    async () => {
      const normalizer = new DefaultTransportRequestNormalizer();
      const raw = {
        method: 'get',
        path: '/items',
        headers: { Host: 'localhost' },
        query: { sort: 'asc' },
      };

      const rawSnapshot = JSON.stringify(raw);
      const normalized = normalizer.normalize(raw);

      assert.strictEqual(JSON.stringify(raw), rawSnapshot);
      assert.ok(Object.isFrozen(normalized));
      assert.ok(Object.isFrozen(normalized.headers));
      assert.ok(Object.isFrozen(normalized.query));
      assert.ok(Object.isFrozen(normalized.params));
    },
  );

  await t.test(
    '3. Header Normalization: Case-insensitive header keys with invalid character protection',
    async () => {
      const normalizer = new DefaultTransportRequestNormalizer();
      const raw = {
        headers: {
          AUTHORIZATION: 'Bearer token-A',
          'X-Api-Key': 'key-123',
        },
      };

      const normalized = normalizer.normalize(raw);
      assert.strictEqual(normalized.headers?.['authorization'], 'Bearer token-A');
      assert.strictEqual(normalized.headers?.['x-api-key'], 'key-123');

      // Invalid header names in response headers
      assert.throws(() => {
        TransportResponseHeaders.normalize({ 'invalid header with space': 'value' });
      }, /Invalid HTTP header name/);
    },
  );

  await t.test(
    '4. Request Context Creation & Scope Disposal Guarantee: ContextManager owns disposal exactly once',
    async () => {
      let observedContext: RequestContext | null = null;

      class TestController {
        public handleAction(): string {
          observedContext = contextManager.getCurrentContext() ?? null;
          return 'ok';
        }
      }

      const container = new ContainerBuilder()
        .register({ token: TestController, useClass: TestController, scope: 'REQUEST' })
        .build();
      container.makeReady();

      const contextManager = new RequestContextManager(container);
      const executionEngine = new ExecutionEngine();
      const responseProcessor = new ResponseProcessor();
      const exceptionPipeline = new ExceptionPipeline();

      const pipeline = new TransportPipeline({
        contextManager,
        executionEngine,
        responseProcessor,
        exceptionPipeline,
      });

      const action: ActionDescriptor = {
        id: 'test-action',
        controllerToken: TestController,
        methodName: 'handleAction',
        parameterBindings: [],
        guards: [],
        middleware: [],
        interceptors: [],
      };

      const result = await pipeline.execute(action, { method: 'GET', path: '/test' });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.descriptor.status, 200);
      assert.strictEqual(result.descriptor.body, 'ok');
      assert.ok(observedContext !== null);
      assert.strictEqual((observedContext as RequestContext).state, 'DISPOSED');
    },
  );

  await t.test(
    '5. 1,000 Concurrent Request Isolation: Parallel transport executions maintain absolute isolation',
    async () => {
      class ParallelController {
        public async execute(id: string): Promise<{ reqId: unknown }> {
          await new Promise((r) => setTimeout(r, Math.random() * 5));
          return { reqId: id };
        }
      }

      const container = new ContainerBuilder()
        .register({ token: ParallelController, useClass: ParallelController, scope: 'REQUEST' })
        .build();
      container.makeReady();

      const contextManager = new RequestContextManager(container);
      const executionEngine = new ExecutionEngine();
      const responseProcessor = new ResponseProcessor();
      const exceptionPipeline = new ExceptionPipeline();

      const pipeline = new TransportPipeline({
        contextManager,
        executionEngine,
        responseProcessor,
        exceptionPipeline,
      });

      const action: ActionDescriptor = {
        id: 'parallel-action',
        controllerToken: ParallelController,
        methodName: 'execute',
        parameterBindings: [
          {
            id: 'p-id',
            actionId: 'parallel-action',
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

      const promises = Array.from({ length: 1000 }, async (_, i) => {
        const rawReq = {
          method: 'GET',
          path: `/users/${i}`,
          params: { id: `id-${i}` },
          headers: { 'x-request-id': `req-${i}` },
        };

        const res = await pipeline.execute(action, rawReq);
        assert.strictEqual(res.success, true);
        assert.strictEqual(res.descriptor.status, 200);
        const body = res.descriptor.body as { reqId: string };
        assert.strictEqual(body.reqId, `id-${i}`);
      });

      await Promise.all(promises);

      const diag = pipeline.diagnostics;
      assert.strictEqual(diag.totalRequests, 1000);
      assert.strictEqual(diag.successfulRequests, 1000);
      assert.strictEqual(diag.failedRequests, 0);
    },
  );

  await t.test(
    '6. Execution Integration & Response Writing: Controller result converts to ResponseDescriptor and writes via writer',
    async () => {
      class ItemController {
        public getDetails(): { item: string; price: number } {
          return { item: 'Widget', price: 99.99 };
        }
      }

      const container = new ContainerBuilder()
        .register({ token: ItemController, useClass: ItemController, scope: 'REQUEST' })
        .build();
      container.makeReady();

      const contextManager = new RequestContextManager(container);
      const executionEngine = new ExecutionEngine();
      const responseProcessor = new ResponseProcessor();
      const exceptionPipeline = new ExceptionPipeline();

      const pipeline = new TransportPipeline({
        contextManager,
        executionEngine,
        responseProcessor,
        exceptionPipeline,
      });

      const action: ActionDescriptor = {
        id: 'item-action',
        controllerToken: ItemController,
        methodName: 'getDetails',
        parameterBindings: [],
        guards: [],
        middleware: [],
        interceptors: [],
      };

      const mockWriter = new MockTransportResponseWriter();
      const mockRes: MockNativeResponse = { headers: {}, written: false };

      const result = await pipeline.execute(
        action,
        { method: 'GET', path: '/items/1' },
        mockRes,
        mockWriter,
      );

      assert.strictEqual(result.success, true);
      assert.strictEqual(mockRes.written, true);
      assert.strictEqual(mockRes.statusCode, 200);
      assert.strictEqual(mockRes.headers['content-type'], 'application/json');
      assert.deepStrictEqual(mockRes.body, { item: 'Widget', price: 99.99 });
    },
  );

  await t.test(
    '7. Exception Pipeline Failure Integration: Controller / Guard / Validation error maps to ErrorDescriptor and writes response',
    async () => {
      class AuthGuard implements Guard {
        public canActivate(): boolean {
          throw new GuardRejectedError('Forbidden: missing admin role');
        }
      }

      class ProtectedController {
        public secretAction(): string {
          return 'secret';
        }
      }

      const container = new ContainerBuilder()
        .register({ token: ProtectedController, useClass: ProtectedController, scope: 'REQUEST' })
        .register({ token: AuthGuard, useClass: AuthGuard, scope: 'REQUEST' })
        .build();
      container.makeReady();

      const contextManager = new RequestContextManager(container);
      const executionEngine = new ExecutionEngine();
      const responseProcessor = new ResponseProcessor();
      const exceptionPipeline = new ExceptionPipeline();

      const pipeline = new TransportPipeline({
        contextManager,
        executionEngine,
        responseProcessor,
        exceptionPipeline,
      });

      const protectedAction: ActionDescriptor = {
        id: 'protected-action',
        controllerToken: ProtectedController,
        methodName: 'secretAction',
        parameterBindings: [],
        guards: [AuthGuard],
        middleware: [],
        interceptors: [],
      };

      const mockWriter = new MockTransportResponseWriter();
      const mockRes: MockNativeResponse = { headers: {}, written: false };

      const result = await pipeline.execute(
        protectedAction,
        { method: 'GET', path: '/secret' },
        mockRes,
        mockWriter,
      );

      assert.strictEqual(result.success, false);
      assert.strictEqual(mockRes.written, true);
      assert.strictEqual(mockRes.statusCode, 403);
      assert.ok(mockRes.headers['content-type']?.includes('application/json'));
      assert.strictEqual((mockRes.body as { category?: string }).category, 'AUTHORIZATION');
    },
  );

  await t.test(
    '8. External Cancellation & AbortSignal Propagation: Propagates client abort to RequestContext and handles safely',
    async () => {
      class SlowController {
        public async slowAction(): Promise<string> {
          await new Promise((r) => setTimeout(r, 200));
          return 'done';
        }
      }

      const container = new ContainerBuilder()
        .register({ token: SlowController, useClass: SlowController, scope: 'REQUEST' })
        .build();
      container.makeReady();

      const contextManager = new RequestContextManager(container);
      const executionEngine = new ExecutionEngine();
      const responseProcessor = new ResponseProcessor();
      const exceptionPipeline = new ExceptionPipeline();

      const pipeline = new TransportPipeline({
        contextManager,
        executionEngine,
        responseProcessor,
        exceptionPipeline,
      });

      const action: ActionDescriptor = {
        id: 'slow-action',
        controllerToken: SlowController,
        methodName: 'slowAction',
        parameterBindings: [],
        guards: [],
        middleware: [],
        interceptors: [],
      };

      const controller = new AbortController();
      setTimeout(() => controller.abort(), 20);

      const result = await pipeline.execute(
        action,
        { method: 'GET', path: '/slow' },
        undefined,
        undefined,
        { abortSignal: controller.signal },
      );

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.descriptor.status, 499);
      assert.strictEqual(
        (result.descriptor.body as { category?: string }).category,
        'CANCELLATION',
      );

      const diag = pipeline.diagnostics;
      assert.ok(diag.abortedRequests >= 1);
    },
  );

  await t.test(
    '9. Execution Timeout Handling: Exceeded timeout triggers cancellation and produces 504 Gateway Timeout',
    async () => {
      class HangingController {
        public async hangAction(): Promise<string> {
          await new Promise((r) => setTimeout(r, 500));
          return 'hang-done';
        }
      }

      const container = new ContainerBuilder()
        .register({ token: HangingController, useClass: HangingController, scope: 'REQUEST' })
        .build();
      container.makeReady();

      const contextManager = new RequestContextManager(container);
      const executionEngine = new ExecutionEngine();
      const responseProcessor = new ResponseProcessor();
      const exceptionPipeline = new ExceptionPipeline();

      const pipeline = new TransportPipeline({
        contextManager,
        executionEngine,
        responseProcessor,
        exceptionPipeline,
      });

      const action: ActionDescriptor = {
        id: 'hang-action',
        controllerToken: HangingController,
        methodName: 'hangAction',
        parameterBindings: [],
        guards: [],
        middleware: [],
        interceptors: [],
      };

      const result = await pipeline.execute(
        action,
        { method: 'GET', path: '/hang' },
        undefined,
        undefined,
        { timeoutMs: 30 },
      );

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.descriptor.status, 504);
      assert.strictEqual((result.descriptor.body as { category?: string }).category, 'TIMEOUT');
    },
  );

  await t.test(
    '10. Lifecycle State Enforcement: Transitions CREATED -> READY -> RUNNING -> STOPPING -> STOPPED and blocks requests on shutdown',
    async () => {
      const lifecycle = new TransportLifecycleManager();
      assert.strictEqual(lifecycle.state, 'CREATED');

      lifecycle.makeReady();
      assert.strictEqual(lifecycle.state, 'READY');

      lifecycle.start();
      assert.strictEqual(lifecycle.state, 'RUNNING');

      await lifecycle.stop();
      assert.strictEqual(lifecycle.state, 'STOPPED');

      assert.throws(() => {
        lifecycle.acquireRequest();
      }, TransportStateError);
    },
  );

  await t.test(
    '11. Graceful Shutdown Draining: In-flight requests complete before state reaches STOPPED',
    async () => {
      let inFlightFinished = false;

      class InFlightController {
        public async run(): Promise<string> {
          await new Promise((r) => setTimeout(r, 60));
          inFlightFinished = true;
          return 'in-flight-done';
        }
      }

      const container = new ContainerBuilder()
        .register({ token: InFlightController, useClass: InFlightController, scope: 'REQUEST' })
        .build();
      container.makeReady();

      const contextManager = new RequestContextManager(container);
      const executionEngine = new ExecutionEngine();
      const responseProcessor = new ResponseProcessor();
      const exceptionPipeline = new ExceptionPipeline();
      const lifecycle = new TransportLifecycleManager();

      const pipeline = new TransportPipeline({
        contextManager,
        executionEngine,
        responseProcessor,
        exceptionPipeline,
        lifecycleManager: lifecycle,
      });

      const action: ActionDescriptor = {
        id: 'in-flight-action',
        controllerToken: InFlightController,
        methodName: 'run',
        parameterBindings: [],
        guards: [],
        middleware: [],
        interceptors: [],
      };

      // Launch in-flight request
      const reqPromise = pipeline.execute(action, { method: 'GET', path: '/drain' });

      // Initiate shutdown shortly after
      await new Promise((r) => setTimeout(r, 10));
      const stopPromise = lifecycle.stop();

      // New requests must be rejected immediately during STOPPING
      assert.throws(() => {
        lifecycle.acquireRequest();
      }, TransportStateError);

      await Promise.all([reqPromise, stopPromise]);

      assert.strictEqual(inFlightFinished, true);
      assert.strictEqual(lifecycle.state, 'STOPPED');
      assert.strictEqual(lifecycle.activeRequests, 0);
    },
  );

  await t.test(
    '12. Adapter Registry: Register, duplicate rejection, override, lookup, and immutable list snapshot',
    async () => {
      const registry = new TransportAdapterRegistry({ allowOverride: false });

      const adapterA: TransportAdapter = {
        name: 'express-adapter',
        normalizeRequest: (r) => r as NormalizedRequest,
        writeResponse: () => {},
      };

      const adapterB: TransportAdapter = {
        name: 'fastify-adapter',
        normalizeRequest: (r) => r as NormalizedRequest,
        writeResponse: () => {},
      };

      registry.register(adapterA);
      registry.register(adapterB);

      assert.strictEqual(registry.has('express-adapter'), true);
      assert.strictEqual(registry.get('express-adapter')?.name, 'express-adapter');

      // Duplicate registration rejected
      assert.throws(() => {
        registry.register(adapterA);
      }, TransportAdapterError);

      const list = registry.list();
      assert.strictEqual(list.length, 2);
      assert.ok(Object.isFrozen(list));

      registry.unregister('express-adapter');
      assert.strictEqual(registry.has('express-adapter'), false);
    },
  );

  await t.test(
    '13. Security: Diagnostics snapshot never leaks Authorization headers, cookies, passwords, or payloads',
    async () => {
      class SecureController {
        public processPayload(): { status: string } {
          return { status: 'processed' };
        }
      }

      const container = new ContainerBuilder()
        .register({ token: SecureController, useClass: SecureController, scope: 'REQUEST' })
        .build();
      container.makeReady();

      const contextManager = new RequestContextManager(container);
      const executionEngine = new ExecutionEngine();
      const responseProcessor = new ResponseProcessor();
      const exceptionPipeline = new ExceptionPipeline();

      const pipeline = new TransportPipeline({
        contextManager,
        executionEngine,
        responseProcessor,
        exceptionPipeline,
      });

      const action: ActionDescriptor = {
        id: 'secure-action',
        controllerToken: SecureController,
        methodName: 'processPayload',
        parameterBindings: [],
        guards: [],
        middleware: [],
        interceptors: [],
      };

      await pipeline.execute(action, {
        method: 'POST',
        path: '/secure',
        headers: {
          authorization: 'Bearer super-secret-jwt-token',
          cookie: 'session_id=secret-cookie-value',
        },
        body: { password: 'my-super-secret-password' },
      });

      const diag = pipeline.diagnostics;
      const diagStr = JSON.stringify(diag);

      assert.ok(!diagStr.includes('super-secret-jwt-token'));
      assert.ok(!diagStr.includes('secret-cookie-value'));
      assert.ok(!diagStr.includes('my-super-secret-password'));
      assert.ok(Object.isFrozen(diag));
    },
  );

  await t.test(
    '14. Full End-to-End Pipeline Integration: Decorators -> MetadataRegistry -> Discovery -> Compiler -> DI -> RequestContext -> ParameterBinding -> ExecutionEngine -> ResponseProcessor -> TransportPipeline -> MockResponseWriter',
    async () => {
      MetadataRegistrar.reset();

      // 1. Define Controller & Module
      @Controller('/api/orders')
      class OrderController {
        @Get('/:orderId')
        public getOrder(
          @Param('orderId') orderId: string,
          @Query('includeItems') includeItems: string,
        ): { orderId: string; includeItems: boolean; status: string } {
          return {
            orderId,
            includeItems: includeItems === 'true',
            status: 'CONFIRMED',
          };
        }
      }
      void OrderController;

      @Module({
        controllers: [OrderController],
      })
      class OrderAppModule {}
      void OrderAppModule;

      // 2. Discover & Compile Metadata
      const metadataBuilder = new MetadataBuilder();
      const metadataRegistry = new MetadataRegistry(metadataBuilder.build());
      MetadataRegistrar.finalize(MetadataRegistrar.getCollector(), metadataRegistry);

      const discovery = await new DiscoveryEngine(
        new DiscoveryBuilder().setMetadataRegistry(metadataRegistry).build(),
      ).discover();
      const compilation = await new ModuleCompiler(new CompilerBuilder().build()).compile(
        discovery,
      );
      assert.ok(compilation);

      // 3. Parameter Binding Compilation
      const compiledBindings = ParameterBindingCompiler.compileFromRegistry(metadataRegistry);
      const actionKey = 'OrderController:getOrder:GET:/:orderId';
      const bindings = compiledBindings.get(actionKey) || Array.from(compiledBindings.values())[0];

      // 4. Setup DI Runtime & ActionDescriptor
      const container = new ContainerBuilder()
        .register({ token: OrderController, useClass: OrderController, scope: 'REQUEST' })
        .build();
      container.makeReady();

      const actionDescriptor: ActionDescriptor = {
        id: actionKey,
        controllerToken: OrderController,
        methodName: 'getOrder',
        parameterBindings: bindings,
        guards: [],
        middleware: [],
        interceptors: [],
      };

      // 5. Transport Pipeline Assembly
      const contextManager = new RequestContextManager(container);
      const executionEngine = new ExecutionEngine();
      const responseProcessor = new ResponseProcessor();
      const exceptionPipeline = new ExceptionPipeline();

      const transportPipeline = new TransportPipeline({
        contextManager,
        executionEngine,
        responseProcessor,
        exceptionPipeline,
      });

      const mockWriter = new MockTransportResponseWriter();
      const mockRes: MockNativeResponse = { headers: {}, written: false };

      const rawNativeRequest = {
        method: 'GET',
        url: '/api/orders/order-999?includeItems=true',
        headers: {
          host: 'api.coreforge.io',
          accept: 'application/json',
          'x-correlation-id': 'corr-abc-123',
        },
        params: { orderId: 'order-999' },
        query: { includeItems: 'true' },
      };

      const result = await transportPipeline.execute(
        actionDescriptor,
        rawNativeRequest,
        mockRes,
        mockWriter,
      );

      assert.strictEqual(result.success, true);
      assert.strictEqual(mockRes.written, true);
      assert.strictEqual(mockRes.statusCode, 200);
      assert.strictEqual(mockRes.headers['content-type'], 'application/json');
      assert.deepStrictEqual(mockRes.body, {
        orderId: 'order-999',
        includeItems: true,
        status: 'CONFIRMED',
      });
    },
  );

  await t.test(
    '15. Critical Architectural Boundary: Core runtime and framework packages have zero reverse dependency on @coreforge/transport and zero concrete framework imports',
    async () => {
      const frameworkDir = path.resolve(__dirname, '../../..');
      const forbiddenPackages = [
        'di',
        'metadata',
        'decorators',
        'request-context',
        'parameter-binding',
        'execution',
        'response',
        'exceptions',
      ];

      const forbiddenConcreteImports = [
        'express',
        'fastify',
        'node:http',
        'node:net',
        'node:https',
      ];

      for (const pkg of forbiddenPackages) {
        const pkgSrcDir = path.join(frameworkDir, pkg, 'src');
        if (fs.existsSync(pkgSrcDir)) {
          const files = fs.readdirSync(pkgSrcDir, { recursive: true }) as string[];
          for (const file of files) {
            if (typeof file === 'string' && file.endsWith('.ts')) {
              const content = fs.readFileSync(path.join(pkgSrcDir, file), 'utf-8');
              assert.ok(
                !content.includes('@coreforge/transport'),
                `Package @coreforge/${pkg} must not import @coreforge/transport (found in ${file})`,
              );
            }
          }
        }
      }

      // Check transport package itself does not import express, fastify, node:http
      const transportSrcDir = path.join(frameworkDir, 'transport', 'src');
      const transportFiles = fs.readdirSync(transportSrcDir, { recursive: true }) as string[];
      for (const file of transportFiles) {
        if (typeof file === 'string' && file.endsWith('.ts')) {
          const content = fs.readFileSync(path.join(transportSrcDir, file), 'utf-8');
          for (const forbidden of forbiddenConcreteImports) {
            assert.ok(
              !content.includes(`from '${forbidden}'`) &&
                !content.includes(`require('${forbidden}')`),
              `Transport package must not import concrete transport '${forbidden}' (found in ${file})`,
            );
          }
        }
      }
    },
  );
});
