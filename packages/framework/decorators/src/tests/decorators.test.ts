import * as assert from 'node:assert';
import { test } from 'node:test';

import { AssemblerBuilder, RuntimeAssembler } from '@coreforge/assembler';
import { CompilerBuilder, ModuleCompiler } from '@coreforge/compiler';
import { MetadataType } from '@coreforge/contracts';
import { DiscoveryEngine, DiscoveryBuilder } from '@coreforge/discovery';
import { MetadataBuilder, MetadataRegistry } from '@coreforge/metadata';
import { RuntimeInitializer, RuntimeInitializerBuilder } from '@coreforge/runtime-initializer';
import { RuntimeOrchestrator, RuntimeOrchestratorBuilder } from '@coreforge/runtime-orchestrator';
import { ApplicationScanner, ScannerBuilder } from '@coreforge/scanner';

import {
  Body,
  Controller,
  Cookie,
  DecoratorConflictError,
  DecoratorStateError,
  DecoratorTargetError,
  DecoratorValidationError,
  Delete,
  Get,
  Guard,
  Header,
  Inject,
  Injectable,
  Interceptor,
  MetadataRegistrar,
  Middleware,
  Module,
  Param,
  Patch,
  Post,
  Provider,
  Put,
  Query,
  Route,
  Security,
} from '../index';

test('CoreForge Developer Decorator System Package', async (t) => {
  t.beforeEach(() => {
    MetadataRegistrar.reset();
  });

  await t.test('1. @Module() generates correct module metadata', () => {
    class TestController {}
    class TestService {}

    @Module({
      controllers: [TestController],
      providers: [TestService],
      dependencies: ['dep-mod-1'],
    })
    class UserModule {}

    void UserModule;

    const collector = MetadataRegistrar.getCollector();
    const modules = collector.resolve(MetadataType.MODULE);

    assert.strictEqual(modules.length, 1);
    assert.strictEqual(modules[0].id, 'module:UserModule');
    assert.strictEqual(modules[0].target, 'UserModule');
    assert.deepStrictEqual(modules[0].properties['dependencies'], ['dep-mod-1']);
  });

  await t.test('2. @Controller() generates controller metadata', () => {
    @Controller('/users')
    class UserController {}

    void UserController;

    const collector = MetadataRegistrar.getCollector();
    const controllers = collector.resolve(MetadataType.CONTROLLER);

    assert.strictEqual(controllers.length, 1);
    assert.strictEqual(controllers[0].id, 'controller:UserController');
    assert.strictEqual(controllers[0].target, 'UserController');
    assert.strictEqual(controllers[0].properties['path'], '/users');
  });

  await t.test(
    '3. HTTP route decorators generate correct route metadata and preserve ordering',
    () => {
      @Controller('/items')
      class ItemController {
        @Get('/')
        findAll() {}

        @Post('/')
        create() {}

        @Get('/:id')
        findOne() {}

        @Put('/:id')
        update() {}

        @Patch('/:id')
        patch() {}

        @Delete('/:id')
        remove() {}

        @Route('OPTIONS', '/options')
        options() {}
      }

      void ItemController;

      const collector = MetadataRegistrar.getCollector();
      const routes = collector.resolve(MetadataType.ROUTE);
      const actions = collector.resolve(MetadataType.ACTION);

      assert.strictEqual(routes.length, 7);
      assert.strictEqual(actions.length, 7);

      assert.strictEqual(routes[0].properties['method'], 'GET');
      assert.strictEqual(routes[0].properties['path'], '/');
      assert.strictEqual(routes[1].properties['method'], 'POST');
      assert.strictEqual(routes[2].properties['method'], 'GET');
      assert.strictEqual(routes[2].properties['path'], '/:id');
      assert.strictEqual(routes[3].properties['method'], 'PUT');
      assert.strictEqual(routes[4].properties['method'], 'PATCH');
      assert.strictEqual(routes[5].properties['method'], 'DELETE');
      assert.strictEqual(routes[6].properties['method'], 'OPTIONS');
    },
  );

  await t.test(
    '4. @Injectable() and @Provider() generate provider metadata without instantiation',
    () => {
      let constructorCalled = false;

      @Injectable()
      class ServiceA {
        constructor() {
          constructorCalled = true;
        }
      }

      @Provider({ serviceToken: 'CUSTOM_TOKEN', scope: 'TRANSIENT' })
      class ServiceB {
        constructor() {
          constructorCalled = true;
        }
      }

      void ServiceA;
      void ServiceB;

      assert.strictEqual(
        constructorCalled,
        false,
        'Class constructor must not be called during decoration',
      );

      const collector = MetadataRegistrar.getCollector();
      const providers = collector.resolve(MetadataType.PROVIDER);

      assert.strictEqual(providers.length, 2);
      assert.strictEqual(providers[0].id, 'provider:ServiceA');
      assert.strictEqual(providers[0].properties['serviceToken'], 'ServiceA');
      assert.strictEqual(providers[0].properties['scope'], 'SINGLETON');

      assert.strictEqual(providers[1].id, 'provider:CUSTOM_TOKEN');
      assert.strictEqual(providers[1].properties['serviceToken'], 'CUSTOM_TOKEN');
      assert.strictEqual(providers[1].properties['scope'], 'TRANSIENT');
    },
  );

  await t.test('5. @Inject() records dependency metadata without instantiation', () => {
    let constructorCalled = false;

    class InjectedDep {
      constructor() {
        constructorCalled = true;
      }
    }

    class ConsumerService {
      @Inject(InjectedDep)
      public dep!: InjectedDep;

      constructor() {
        constructorCalled = true;
      }
    }

    void ConsumerService;

    assert.strictEqual(constructorCalled, false);

    const collector = MetadataRegistrar.getCollector();
    const all = collector.getAll();
    const injectReg = all.find((r) => r.id.startsWith('inject:ConsumerService'));

    assert.ok(injectReg);
    assert.strictEqual(injectReg.target, 'ConsumerService');
    assert.strictEqual(injectReg.properties['tokenName'], 'InjectedDep');
  });

  await t.test('6. Parameter decorators generate correct parameter metadata', () => {
    @Controller('/api')
    class ApiController {
      @Get('/:id')
      getOne(
        @Param('id') _id: string,
        @Query('page') _page: number,
        @Header('authorization') _auth: string,
        @Cookie('sessionId') _cookie: string,
        @Body() _payload: unknown,
      ) {}
    }

    void ApiController;

    const collector = MetadataRegistrar.getCollector();
    const params = collector.resolve(MetadataType.PARAMETER);

    assert.strictEqual(params.length, 5);

    const paramId = params.find((p) => p.properties['source'] === 'param');
    assert.ok(paramId);
    assert.strictEqual(paramId.properties['name'], 'id');
    assert.strictEqual(paramId.properties['index'], 0);

    const paramQuery = params.find((p) => p.properties['source'] === 'query');
    assert.ok(paramQuery);
    assert.strictEqual(paramQuery.properties['name'], 'page');
    assert.strictEqual(paramQuery.properties['index'], 1);

    const paramHeader = params.find((p) => p.properties['source'] === 'header');
    assert.ok(paramHeader);
    assert.strictEqual(paramHeader.properties['name'], 'authorization');
    assert.strictEqual(paramHeader.properties['index'], 2);

    const paramCookie = params.find((p) => p.properties['source'] === 'cookie');
    assert.ok(paramCookie);
    assert.strictEqual(paramCookie.properties['name'], 'sessionId');
    assert.strictEqual(paramCookie.properties['index'], 3);

    const paramBody = params.find((p) => p.properties['source'] === 'body');
    assert.ok(paramBody);
    assert.strictEqual(paramBody.properties['index'], 4);
  });

  await t.test(
    '7. Middleware, Interceptor, Guard, and Security decorators stage metadata correctly',
    () => {
      const mockMiddleware = () => {};
      const mockInterceptor = () => {};
      const mockGuard = () => {};

      @Middleware(mockMiddleware)
      @Interceptor(mockInterceptor)
      @Guard(mockGuard)
      @Security({ roles: ['ADMIN'] })
      @Controller('/secure')
      class SecureController {
        @Get('/data')
        getData() {}
      }

      void SecureController;

      const collector = MetadataRegistrar.getCollector();
      const middlewares = collector.resolve(MetadataType.MIDDLEWARE);
      const interceptors = collector.resolve(MetadataType.INTERCEPTOR);
      const securities = collector.resolve(MetadataType.SECURITY);

      assert.strictEqual(middlewares.length, 1);
      assert.strictEqual(interceptors.length, 1);
      assert.strictEqual(securities.length, 2); // 1 guard + 1 security
    },
  );

  await t.test(
    '8. Deferred hierarchy resolution correctly maps Module -> Controller -> Action -> Parameter',
    () => {
      @Injectable()
      class TaskService {}

      @Controller('/tasks')
      class TaskController {
        @Get('/:id')
        getTask(@Param('id') _id: string) {}
      }

      @Module({
        controllers: [TaskController],
        providers: [TaskService],
      })
      class TaskModule {}

      void TaskModule;

      const finalized = MetadataRegistrar.finalize();

      const mod = finalized.find((d) => d.type === MetadataType.MODULE);
      const ctrl = finalized.find((d) => d.type === MetadataType.CONTROLLER);
      const prov = finalized.find((d) => d.type === MetadataType.PROVIDER);
      const act = finalized.find((d) => d.type === MetadataType.ACTION);
      const route = finalized.find((d) => d.type === MetadataType.ROUTE);
      const param = finalized.find((d) => d.type === MetadataType.PARAMETER);

      assert.ok(mod);
      assert.ok(ctrl);
      assert.ok(prov);
      assert.ok(act);
      assert.ok(route);
      assert.ok(param);

      assert.strictEqual(ctrl.parentId, mod.id);
      assert.strictEqual(prov.parentId, mod.id);
      assert.strictEqual(act.parentId, ctrl.id);
      assert.strictEqual(route.parentId, ctrl.id);
      assert.strictEqual((route as { path?: string }).path, '/tasks/:id');
      assert.strictEqual(param.parentId, act.id);
    },
  );

  await t.test('9. Invalid decorator usage and parameter indices throw appropriate errors', () => {
    assert.throws(() => {
      Controller('/bad')(null as unknown as new () => unknown);
    }, DecoratorTargetError);

    assert.throws(() => {
      class DummyClass {}
      Get('/fail')(DummyClass as unknown as object, 'bad', {});
    }, DecoratorTargetError);

    assert.throws(() => {
      class ParamClass {
        testMethod() {}
      }
      Param('id')(ParamClass.prototype, 'testMethod', -1);
    }, DecoratorValidationError);

    assert.throws(() => {
      class ParamClass {
        testMethod() {}
      }
      Param('id')(ParamClass.prototype, 'testMethod', 1.5);
    }, DecoratorValidationError);
  });

  await t.test(
    '10. Deferred cross-declaration validation catches conflicting duplicate routes on finalization',
    () => {
      @Controller('/conflict')
      class ConflictController1 {
        @Get('/duplicate')
        actionA() {}
      }

      @Controller('/conflict')
      class ConflictController2 {
        @Get('/duplicate')
        actionB() {}
      }

      void ConflictController1;
      void ConflictController2;

      assert.throws(() => {
        MetadataRegistrar.finalize();
      }, DecoratorConflictError);
    },
  );

  await t.test(
    '11. Collector becomes immutable in READY state and rejects further registrations',
    () => {
      @Controller('/locked')
      class LockedController {
        @Get('/')
        index() {}
      }

      void LockedController;

      const collector = MetadataRegistrar.getCollector();
      collector.makeReady();

      assert.throws(() => {
        @Controller('/late')
        class LateController {}
        void LateController;
      }, DecoratorStateError);
    },
  );

  await t.test(
    '12. Isolated collector contexts prevent cross-application and cross-test leakage',
    () => {
      const collector1 = MetadataRegistrar.createIsolated();
      const collector2 = MetadataRegistrar.createIsolated();

      MetadataRegistrar.runWithCollector(collector1, () => {
        @Controller('/app1')
        class App1Controller {
          @Get('/')
          get1() {}
        }
        void App1Controller;
      });

      MetadataRegistrar.runWithCollector(collector2, () => {
        @Controller('/app2')
        class App2Controller {
          @Get('/')
          get2() {}
        }
        void App2Controller;
      });

      const routes1 = collector1.resolve(MetadataType.ROUTE);
      const routes2 = collector2.resolve(MetadataType.ROUTE);

      assert.strictEqual(routes1.length, 1);
      assert.strictEqual(routes1[0].target, 'App1Controller');

      assert.strictEqual(routes2.length, 1);
      assert.strictEqual(routes2[0].target, 'App2Controller');

      assert.strictEqual(collector1.getAll().length, 3);
      assert.strictEqual(collector2.getAll().length, 3);
    },
  );

  await t.test(
    '13. Full End-to-End Pipeline Integration: Decorators -> MetadataRegistry -> Discovery -> Compiler -> Scanner -> Assembler -> Initializer -> Orchestrator',
    async () => {
      const isolatedCollector = MetadataRegistrar.createIsolated();

      MetadataRegistrar.runWithCollector(isolatedCollector, () => {
        @Injectable()
        class UsersService {
          public getUsers() {
            return [{ id: '1', name: 'Alice' }];
          }
        }

        @Controller('/users')
        class UsersController {
          @Get('/')
          public findAll() {
            return [];
          }

          @Get('/:id')
          public findOne(@Param('id') _id: string) {
            return { id: _id };
          }
        }

        @Module({
          controllers: [UsersController],
          providers: [UsersService],
        })
        class AppModule {}

        void AppModule;
      });

      // 1. Authoritative MetadataRegistry
      const metadataBuilder = new MetadataBuilder();
      const metadataRegistry = new MetadataRegistry(metadataBuilder.build());

      // 2. Finalize staging collector into authoritative MetadataRegistry
      MetadataRegistrar.finalize(isolatedCollector, metadataRegistry);
      metadataRegistry.makeReady();

      // 3. Discovery Engine
      const discoveryBuilder = new DiscoveryBuilder().setMetadataRegistry(metadataRegistry);
      const discoveryEngine = new DiscoveryEngine(discoveryBuilder.build());
      const discoveryResult = await discoveryEngine.discover();

      assert.strictEqual(discoveryResult.modules.length, 1);
      assert.strictEqual(discoveryResult.controllers.length, 1);
      assert.strictEqual(discoveryResult.providers.length, 1);
      assert.strictEqual(discoveryResult.routes.length, 2);

      // 4. Module Compiler
      const compilerBuilder = new CompilerBuilder();
      const compiler = new ModuleCompiler(compilerBuilder.build());
      const compilationResult = await compiler.compile(discoveryResult);
      assert.ok(compilationResult.application);

      // 5. Application Scanner
      const scannerBuilder = new ScannerBuilder();
      const scanner = new ApplicationScanner(scannerBuilder.build());
      const scanResult = await scanner.scan(compilationResult);
      assert.ok(scanResult.registrations.length >= 4);

      // 6. Runtime Assembler
      const assemblerBuilder = new AssemblerBuilder();
      const assembler = new RuntimeAssembler(assemblerBuilder.build());
      const assemblyResult = await assembler.assemble(scanResult);
      assert.strictEqual(assemblyResult.runtime.modules.length, 1);
      assert.strictEqual(assemblyResult.runtime.controllers.length, 1);
      assert.strictEqual(assemblyResult.runtime.providers.length, 1);
      assert.strictEqual(assemblyResult.runtime.routes.length, 2);

      // 7. Runtime Initializer
      const initializerBuilder = new RuntimeInitializerBuilder();
      const initializer = new RuntimeInitializer(initializerBuilder.build());
      const initResult = await initializer.initialize(assemblyResult.runtime);
      assert.ok(initResult.runtime);

      // 8. Runtime Orchestrator
      const orchestratorBuilder = new RuntimeOrchestratorBuilder();
      const orchestrator = new RuntimeOrchestrator(orchestratorBuilder.build());
      const execResult = await orchestrator.start(initResult.runtime);
      assert.strictEqual(execResult.started, true);

      await orchestrator.stop();
    },
  );
});
