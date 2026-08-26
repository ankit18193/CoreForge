import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { test } from 'node:test';

import { CompilerBuilder, ModuleCompiler } from '@coreforge/compiler';
import {
  Controller,
  Get,
  MetadataRegistrar,
  Module,
  Param,
  Post,
  Query,
} from '@coreforge/decorators';
import { ContainerBuilder } from '@coreforge/di';
import { DiscoveryBuilder, DiscoveryEngine } from '@coreforge/discovery';
import { ExceptionPipeline } from '@coreforge/exceptions';
import { ActionDescriptor, ActionExecutionEngine as ExecutionEngine } from '@coreforge/execution';
import { MetadataBuilder, MetadataRegistry } from '@coreforge/metadata';
import { ParameterBindingCompiler } from '@coreforge/parameter-binding';
import { RequestContextManager } from '@coreforge/request-context';
import { ResponseProcessor } from '@coreforge/response';
import { RouteCompiler, RouteMatcher, RouteRegistry } from '@coreforge/routing';
import { TransportPipeline } from '@coreforge/transport';

import {
  RuntimeComponentRegistry,
  RuntimeOrchestrator,
  RuntimePipelineResult,
  RuntimeStateError,
} from '../src/index';

class MockResponseWriter {
  public written = false;
  public statusCode?: number | undefined;
  public headers: Record<string, string | readonly string[]> = {};
  public body: unknown;

  public write(_res: unknown, descriptor: import('@coreforge/contracts').ResponseDescriptor): void {
    this.written = true;
    this.statusCode = descriptor.status;
    this.headers = { ...descriptor.headers.values };
    this.body = descriptor.body;
  }
}

function createCompleteRuntime(): {
  runtime: RuntimeOrchestrator;
  registry: RuntimeComponentRegistry;
  routeRegistry: RouteRegistry;
  routeCompiler: RouteCompiler;
} {
  const container = new ContainerBuilder().build();
  const contextManager = new RequestContextManager(container);
  const executionEngine = new ExecutionEngine();
  const responseProcessor = new ResponseProcessor();
  const exceptionPipeline = new ExceptionPipeline();

  const routeRegistry = new RouteRegistry();
  const routeCompiler = new RouteCompiler();
  const routeMatcher = new RouteMatcher(routeRegistry);

  const transportPipeline = new TransportPipeline({
    contextManager,
    executionEngine,
    responseProcessor,
    exceptionPipeline,
  });

  const componentRegistry = new RuntimeComponentRegistry();
  componentRegistry.setContainer(container);
  componentRegistry.setRequestContextManager(contextManager);
  componentRegistry.setExecutionEngine(executionEngine);
  componentRegistry.setResponseProcessor(responseProcessor);
  componentRegistry.setExceptionPipeline(exceptionPipeline);
  componentRegistry.setRouteMatcher(routeMatcher);
  componentRegistry.setTransportPipeline(transportPipeline);

  const runtime = new RuntimeOrchestrator(componentRegistry, {
    enableDiagnostics: true,
    shutdownTimeoutMs: 1000,
  });

  return {
    runtime,
    registry: componentRegistry,
    routeRegistry,
    routeCompiler,
  };
}

test('CoreForge Application Runtime Orchestrator & Lifecycle Engine (@coreforge/runtime)', async (t) => {
  await t.test(
    '1. Deterministic Startup Sequence: Transitions CREATED -> VALIDATING -> COMPILING -> INITIALIZING -> READY',
    async () => {
      const { runtime } = createCompleteRuntime();

      assert.strictEqual(runtime.state, 'CREATED');
      assert.strictEqual(runtime.ready, false);

      await runtime.start();

      assert.strictEqual(runtime.state, 'READY');
      assert.strictEqual(runtime.ready, true);
      assert.ok(runtime.snapshot.startedAt! > 0);
      assert.strictEqual(runtime.snapshot.activeRequests, 0);

      await runtime.stop();
      assert.strictEqual(runtime.state, 'STOPPED');
      assert.ok(runtime.snapshot.stoppedAt! > 0);
    },
  );

  await t.test(
    '2. Startup Validation & Failure Rollback: Incomplete registry fails early and rolls back to FAILED',
    async () => {
      const emptyRegistry = new RuntimeComponentRegistry();
      const runtime = new RuntimeOrchestrator(emptyRegistry);

      assert.strictEqual(runtime.state, 'CREATED');

      await assert.rejects(
        async () => {
          await runtime.start();
        },
        (err: unknown) => {
          return err instanceof Error;
        },
      );

      assert.strictEqual(runtime.state, 'FAILED');
      assert.strictEqual(runtime.ready, false);
    },
  );

  await t.test(
    '3. Idempotent Lifecycle Semantics: Double start and double stop are safe, start after stop is rejected',
    async () => {
      const { runtime } = createCompleteRuntime();

      await runtime.start();
      assert.strictEqual(runtime.state, 'READY');

      // Idempotent double start
      await runtime.start();
      assert.strictEqual(runtime.state, 'READY');

      await runtime.stop();
      assert.strictEqual(runtime.state, 'STOPPED');

      // Idempotent double stop
      await runtime.stop();
      assert.strictEqual(runtime.state, 'STOPPED');

      // Start after stop is rejected
      await assert.rejects(async () => {
        await runtime.start();
      }, RuntimeStateError);
    },
  );

  await t.test(
    '4. Request Blocking: Requests before READY or during/after STOPPING are rejected',
    async () => {
      const { runtime } = createCompleteRuntime();

      // Before start
      await assert.rejects(async () => {
        await runtime.handle({ method: 'GET', path: '/test' });
      }, RuntimeStateError);

      await runtime.start();
      assert.strictEqual(runtime.ready, true);

      await runtime.stop();

      // After stop
      await assert.rejects(async () => {
        await runtime.handle({ method: 'GET', path: '/test' });
      }, RuntimeStateError);
    },
  );

  await t.test(
    '5. Canonical Request Pipeline Execution: Native request -> Normalization -> Routing -> RequestContext -> Execution -> Response -> Transport Writer',
    async () => {
      const { runtime, routeRegistry, routeCompiler } = createCompleteRuntime();

      class UserController {
        public getUser(): { id: string; name: string } {
          return { id: 'usr-100', name: 'Alice' };
        }
      }

      const action: ActionDescriptor = {
        id: 'user.get',
        controllerToken: UserController,
        methodName: 'getUser',
        parameterBindings: [],
        guards: [],
        middleware: [],
        interceptors: [],
      };

      routeRegistry.register(
        routeCompiler.compile({
          id: 'users.get',
          method: 'GET',
          path: '/api/v1/users/:id',
          action,
        }),
      );

      // Register controller in DI
      runtime.registry.container?.register({
        token: UserController,
        useClass: UserController,
        scope: 'REQUEST',
      });

      await runtime.start();

      const mockRes = new MockResponseWriter();
      const rawNativeReq = {
        method: 'GET',
        url: '/api/v1/users/usr-100',
        headers: { 'x-correlation-id': 'corr-abc-123' },
      };

      const result = (await runtime.handle(rawNativeReq, {}, mockRes)) as RuntimePipelineResult;

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.status, 200);
      assert.strictEqual(result.routeId, 'users.get');
      assert.strictEqual(result.correlationId, 'corr-abc-123');
      assert.strictEqual(mockRes.written, true);
      assert.strictEqual(mockRes.statusCode, 200);
      assert.deepStrictEqual(mockRes.body, { id: 'usr-100', name: 'Alice' });

      await runtime.stop();
    },
  );

  await t.test(
    '6. Exception Pipeline Integration: Missing route, method mismatch, and controller errors map cleanly to response',
    async () => {
      const { runtime, routeRegistry, routeCompiler } = createCompleteRuntime();

      class FailingController {
        public throwError(): void {
          throw new Error('Database connection lost');
        }
      }

      const failAction: ActionDescriptor = {
        id: 'fail.action',
        controllerToken: FailingController,
        methodName: 'throwError',
        parameterBindings: [],
        guards: [],
        middleware: [],
        interceptors: [],
      };

      routeRegistry.register(
        routeCompiler.compile({
          id: 'fail.route',
          method: 'GET',
          path: '/api/fail',
          action: failAction,
        }),
      );

      runtime.registry.container?.register({
        token: FailingController,
        useClass: FailingController,
        scope: 'REQUEST',
      });

      await runtime.start();

      // Case A: 404 Route Not Found
      const res404 = (await runtime.handle({
        method: 'GET',
        path: '/non-existent',
      })) as RuntimePipelineResult;
      assert.strictEqual(res404.success, false);
      assert.strictEqual(res404.status, 404);

      // Case B: 405 Method Not Allowed
      const res405 = (await runtime.handle({
        method: 'POST',
        path: '/api/fail',
      })) as RuntimePipelineResult;
      assert.strictEqual(res405.success, false);
      assert.strictEqual(res405.status, 405);

      // Case C: Controller Exception (500)
      const res500 = (await runtime.handle({
        method: 'GET',
        path: '/api/fail',
      })) as RuntimePipelineResult;
      assert.strictEqual(res500.success, false);
      assert.strictEqual(res500.status, 500);

      await runtime.stop();
    },
  );

  await t.test(
    '7. 1,000 Concurrent Requests Isolation: High-concurrency request isolation with zero cross-talk',
    async () => {
      const { runtime, routeRegistry, routeCompiler } = createCompleteRuntime();

      class TenantController {
        public getTenant(tenantId: string): { tenant: string } {
          return { tenant: tenantId };
        }
      }

      for (let i = 0; i < 20; i++) {
        const action: ActionDescriptor = {
          id: `tenant.get.${i}`,
          controllerToken: TenantController,
          methodName: 'getTenant',
          parameterBindings: [
            {
              id: `tenant.param.${i}`,
              actionId: `tenant.get.${i}`,
              parameterIndex: 0,
              source: 'PARAM',
              name: 'tenantId',
              required: true,
            },
          ],
          guards: [],
          middleware: [],
          interceptors: [],
        };

        routeRegistry.register(
          routeCompiler.compile({
            id: `tenant.route.${i}`,
            method: 'GET',
            path: `/tenants/${i}/:tenantId`,
            action,
          }),
        );
      }

      runtime.registry.container?.register({
        token: TenantController,
        useClass: TenantController,
        scope: 'REQUEST',
      });

      await runtime.start();

      const requests = Array.from({ length: 1000 }, async (_, i) => {
        const routeIdx = i % 20;
        const tenantVal = `tenant-${i}`;
        const req = {
          method: 'GET',
          path: `/tenants/${routeIdx}/${tenantVal}`,
          headers: { 'x-correlation-id': `corr-${i}` },
        };

        const result = (await runtime.handle(req)) as RuntimePipelineResult;
        assert.strictEqual(result.success, true);
        assert.strictEqual(result.status, 200);
        assert.strictEqual(result.correlationId, `corr-${i}`);
        assert.deepStrictEqual(result.responseDescriptor?.body, { tenant: tenantVal });
      });

      await Promise.all(requests);

      const diag = runtime.diagnostics;
      assert.strictEqual(diag.totalRequests, 1000);
      assert.strictEqual(diag.successfulRequests, 1000);
      assert.strictEqual(diag.failedRequests, 0);

      await runtime.stop();
    },
  );

  await t.test(
    '8. Graceful Shutdown & Request Draining: In-flight requests drain before transition to STOPPED',
    async () => {
      const { runtime, routeRegistry, routeCompiler } = createCompleteRuntime();

      class SlowController {
        public async slowAction(): Promise<{ message: string }> {
          await new Promise((r) => setTimeout(r, 60));
          return { message: 'completed' };
        }
      }

      const slowAction: ActionDescriptor = {
        id: 'slow.action',
        controllerToken: SlowController,
        methodName: 'slowAction',
        parameterBindings: [],
        guards: [],
        middleware: [],
        interceptors: [],
      };

      routeRegistry.register(
        routeCompiler.compile({
          id: 'slow.route',
          method: 'GET',
          path: '/slow',
          action: slowAction,
        }),
      );

      runtime.registry.container?.register({
        token: SlowController,
        useClass: SlowController,
        scope: 'REQUEST',
      });

      await runtime.start();

      // Launch an in-flight request
      const inFlightPromise = runtime.handle({ method: 'GET', path: '/slow' });

      // Small delay to ensure request is active
      await new Promise((r) => setTimeout(r, 10));

      // Trigger shutdown while request is active
      const stopPromise = runtime.stop();

      // Ensure in-flight request completes successfully
      const result = (await inFlightPromise) as RuntimePipelineResult;
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.status, 200);

      await stopPromise;
      assert.strictEqual(runtime.state, 'STOPPED');
    },
  );

  await t.test(
    '9. Diagnostics & Security: Tracks accurate counters and durations, never storing sensitive payloads',
    async () => {
      const { runtime, routeRegistry, routeCompiler } = createCompleteRuntime();

      class DataController {
        public getData(): string {
          return 'ok';
        }
      }

      const action: ActionDescriptor = {
        id: 'data.get',
        controllerToken: DataController,
        methodName: 'getData',
        parameterBindings: [],
        guards: [],
        middleware: [],
        interceptors: [],
      };

      routeRegistry.register(
        routeCompiler.compile({
          id: 'data.route',
          method: 'GET',
          path: '/data',
          action,
        }),
      );

      runtime.registry.container?.register({
        token: DataController,
        useClass: DataController,
        scope: 'REQUEST',
      });

      await runtime.start();

      await runtime.handle({
        method: 'GET',
        path: '/data',
        headers: {
          authorization: 'Bearer secret-token-xyz',
          cookie: 'session=12345',
        },
      });

      const diag = runtime.diagnostics;
      assert.strictEqual(diag.totalRequests, 1);
      assert.strictEqual(diag.successfulRequests, 1);
      assert.ok(diag.startupDurationMs >= 0);
      assert.ok(Object.isFrozen(diag));

      const diagStr = JSON.stringify(diag);
      assert.ok(!diagStr.includes('Bearer'));
      assert.ok(!diagStr.includes('session'));
      assert.ok(!diagStr.includes('secret-token-xyz'));

      await runtime.stop();
    },
  );

  await t.test(
    '10. Full Monorepo End-to-End Integration: Complete request pipeline through all Phase 5 packages',
    async () => {
      MetadataRegistrar.reset();

      // 1. Declare Controller & Module
      @Controller('/api/v1/orders')
      class OrderController {
        @Get('/:orderId')
        public getOrder(
          @Param('orderId') orderId: string,
          @Query('format') format: string,
        ): { orderId: string; format: string; timestamp: number } {
          return { orderId, format: format || 'json', timestamp: 1787500000 };
        }

        @Post('/')
        public createOrder(): { status: string; id: string } {
          return { status: 'created', id: 'ord-new' };
        }
      }
      void OrderController;

      @Module({
        controllers: [OrderController],
      })
      class OrderModule {}
      void OrderModule;

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

      // 3. DI Container Setup
      const container = new ContainerBuilder()
        .register({ token: OrderController, useClass: OrderController, scope: 'REQUEST' })
        .build();

      // 4. Parameter Binding Compiler
      const paramBindings = ParameterBindingCompiler.compileFromRegistry(metadataRegistry);
      const actionKey = 'OrderController:getOrder:GET:/:orderId';
      const bindings = paramBindings.get(actionKey) || Array.from(paramBindings.values())[0];

      // 5. Action Descriptor & Route Compiler
      const actionDescriptor: ActionDescriptor = {
        id: actionKey,
        controllerToken: OrderController,
        methodName: 'getOrder',
        parameterBindings: bindings,
        guards: [],
        middleware: [],
        interceptors: [],
      };

      const routeCompiler = new RouteCompiler();
      const routeRegistry = new RouteRegistry();
      routeRegistry.register(
        routeCompiler.compile({
          id: 'orders.getOrder',
          method: 'GET',
          path: '/api/v1/orders/:orderId',
          action: actionDescriptor,
        }),
      );

      const routeMatcher = new RouteMatcher(routeRegistry);

      // 6. Subsystem Assembly
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

      // 7. Runtime Component Registry & Orchestrator
      const componentRegistry = new RuntimeComponentRegistry();
      componentRegistry.setMetadataRegistry(metadataRegistry);
      componentRegistry.setContainer(container);
      componentRegistry.setRequestContextManager(contextManager);
      componentRegistry.setExecutionEngine(executionEngine);
      componentRegistry.setResponseProcessor(responseProcessor);
      componentRegistry.setExceptionPipeline(exceptionPipeline);
      componentRegistry.setRouteMatcher(routeMatcher);
      componentRegistry.setTransportPipeline(transportPipeline);

      const runtime = new RuntimeOrchestrator(componentRegistry);

      // 8. Start Runtime
      await runtime.start();
      assert.strictEqual(runtime.state, 'READY');

      // 9. Execute Request via Runtime
      const mockRes = new MockResponseWriter();
      const result = (await runtime.handle(
        {
          method: 'GET',
          url: '/api/v1/orders/ord-9999?format=compact',
          headers: { 'x-correlation-id': 'corr-order-9999' },
        },
        {},
        mockRes,
      )) as RuntimePipelineResult;

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.status, 200);
      assert.strictEqual(result.routeId, 'orders.getOrder');
      assert.strictEqual(mockRes.written, true);
      assert.strictEqual(mockRes.statusCode, 200);
      assert.deepStrictEqual(mockRes.body, {
        orderId: 'ord-9999',
        format: 'compact',
        timestamp: 1787500000,
      });

      // 10. Stop Runtime
      await runtime.stop();
      assert.strictEqual(runtime.state, 'STOPPED');
    },
  );

  await t.test(
    '11. Critical Architectural Boundary: Lower-layer framework packages have zero reverse dependency on @coreforge/runtime',
    async () => {
      const frameworkDir = path.resolve(__dirname, '../../..');
      const lowerLayerPackages = [
        'metadata',
        'decorators',
        'di',
        'request-context',
        'parameter-binding',
        'routing',
        'execution',
        'response',
        'exceptions',
        'transport',
      ];

      for (const pkg of lowerLayerPackages) {
        const pkgSrcDir = path.join(frameworkDir, pkg, 'src');
        if (fs.existsSync(pkgSrcDir)) {
          const files = fs.readdirSync(pkgSrcDir, { recursive: true }) as string[];
          for (const file of files) {
            if (typeof file === 'string' && file.endsWith('.ts')) {
              const content = fs.readFileSync(path.join(pkgSrcDir, file), 'utf-8');
              assert.ok(
                !content.includes('@coreforge/runtime') || content.includes('@coreforge/runtime-'),
                `Lower layer package @coreforge/${pkg} must not import @coreforge/runtime (found in ${file})`,
              );
            }
          }
        }
      }
    },
  );
});
