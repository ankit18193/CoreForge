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
  CircularDependencyError,
  Container,
  ContainerBuilder,
  ContainerStateError,
  DuplicateProviderError,
  OnDestroy,
  OnInit,
  PropertyInjection,
  ProviderNotFoundError,
  ScopeError,
} from '../src/index';

test('CoreForge Dependency Injection & Runtime Container Package (@coreforge/di)', async (t) => {
  await t.test('1. Class, value, and factory provider registration and resolution', async () => {
    class DatabaseService {
      public readonly name = 'DatabaseService';
    }

    const CONFIG_TOKEN = Symbol('CONFIG');
    const configValue = { host: 'localhost', port: 5432 };

    const FACTORY_TOKEN = 'LOGGER_FACTORY';

    const container = new ContainerBuilder()
      .registerClass(DatabaseService, DatabaseService, 'SINGLETON')
      .registerValue(CONFIG_TOKEN, configValue)
      .registerFactory(
        FACTORY_TOKEN,
        (config: unknown) => {
          const conf = config as { host: string; port: number };
          return {
            log: (msg: string) => `[${conf.host}:${conf.port}] ${msg}`,
          };
        },
        [CONFIG_TOKEN],
        'SINGLETON',
      )
      .build();

    container.makeReady();

    const db = await container.resolve(DatabaseService);
    const conf = await container.resolve<typeof configValue>(CONFIG_TOKEN);
    const logger = await container.resolve<{ log: (msg: string) => string }>(FACTORY_TOKEN);

    assert.strictEqual(db.name, 'DatabaseService');
    assert.deepStrictEqual(conf, { host: 'localhost', port: 5432 });
    assert.strictEqual(logger.log('hello'), '[localhost:5432] hello');
  });

  await t.test('2. Duplicate token rejection without override and allowed with override', () => {
    class ServiceV1 {
      public version = 1;
    }
    class ServiceV2 {
      public version = 2;
    }

    // Default: reject duplicate
    assert.throws(() => {
      new ContainerBuilder()
        .registerClass('SERVICE', ServiceV1)
        .registerClass('SERVICE', ServiceV2)
        .build();
    }, DuplicateProviderError);

    // Override enabled: replaces provider
    const container = new ContainerBuilder()
      .setOptions({ allowOverride: true })
      .registerClass('SERVICE', ServiceV1)
      .registerClass('SERVICE', ServiceV2)
      .build();

    assert.ok(container.has('SERVICE'));
  });

  await t.test(
    '3. Recursive constructor dependency resolution (Controller -> Service -> Repository -> Config)',
    async () => {
      const CONFIG_TOKEN = 'APP_CONFIG';

      class ConfigService {
        public readonly env = 'production';
      }

      class UserRepository {
        constructor(public readonly config: ConfigService) {}
      }

      class UserService {
        constructor(public readonly userRepo: UserRepository) {}
      }

      class UserController {
        constructor(public readonly userService: UserService) {}
      }

      const container = new ContainerBuilder()
        .registerValue(CONFIG_TOKEN, new ConfigService())
        .registerClass(UserRepository, UserRepository, 'SINGLETON', [CONFIG_TOKEN])
        .registerClass(UserService, UserService, 'SINGLETON', [UserRepository])
        .registerClass(UserController, UserController, 'SINGLETON', [UserService])
        .build();

      container.makeReady();

      const controller = await container.resolve(UserController);

      assert.ok(controller);
      assert.ok(controller.userService);
      assert.ok(controller.userService.userRepo);
      assert.strictEqual(controller.userService.userRepo.config.env, 'production');
    },
  );

  await t.test(
    '4. Property injection resolution using compiled PropertyInjection descriptors without runtime reflection',
    async () => {
      class LoggerService {
        public log(msg: string): string {
          return `LOG: ${msg}`;
        }
      }

      class NotificationService {
        public logger!: LoggerService;
        public channel = 'email';
      }

      const propertyInjections: readonly PropertyInjection[] = [
        {
          propertyKey: 'logger',
          token: LoggerService,
        },
      ];

      const container = new ContainerBuilder()
        .registerClass(LoggerService, LoggerService, 'SINGLETON')
        .registerClass(
          NotificationService,
          NotificationService,
          'SINGLETON',
          [],
          propertyInjections,
        )
        .build();

      container.makeReady();

      const notif = await container.resolve(NotificationService);

      assert.ok(notif);
      assert.ok(notif.logger);
      assert.strictEqual(notif.logger.log('ready'), 'LOG: ready');
    },
  );

  await t.test('5. Missing provider throws ProviderNotFoundError', async () => {
    const container = new Container();
    container.makeReady();

    await assert.rejects(async () => {
      await container.resolve('UNREGISTERED_TOKEN');
    }, ProviderNotFoundError);
  });

  await t.test(
    '6. Scope semantics: Singleton reuse, Request isolation, Transient recreation',
    async () => {
      let singletonCounter = 0;
      let requestCounter = 0;
      let transientCounter = 0;

      class SingletonItem {
        public readonly id = ++singletonCounter;
      }

      class RequestItem {
        public readonly id = ++requestCounter;
      }

      class TransientItem {
        public readonly id = ++transientCounter;
      }

      const container = new ContainerBuilder()
        .registerClass(SingletonItem, SingletonItem, 'SINGLETON')
        .registerClass(RequestItem, RequestItem, 'REQUEST')
        .registerClass(TransientItem, TransientItem, 'TRANSIENT')
        .build();

      container.makeReady();

      // 1. Singleton: same instance on multiple resolutions
      const s1 = await container.resolve(SingletonItem);
      const s2 = await container.resolve(SingletonItem);
      assert.strictEqual(s1, s2);
      assert.strictEqual(s1.id, 1);

      // 2. Request scope: isolated between scopes, shared within scope
      const scopeA = container.createScope();
      const scopeB = container.createScope();

      const rA1 = await scopeA.resolve(RequestItem);
      const rA2 = await scopeA.resolve(RequestItem);
      const rB1 = await scopeB.resolve(RequestItem);

      assert.strictEqual(rA1, rA2, 'Same request scope must reuse instance');
      assert.notStrictEqual(rA1, rB1, 'Different request scopes must have different instances');
      assert.strictEqual(rA1.id, 1);
      assert.strictEqual(rB1.id, 2);

      // 3. Transient: fresh instance on every resolution
      const t1 = await container.resolve(TransientItem);
      const t2 = await container.resolve(TransientItem);
      assert.notStrictEqual(t1, t2);
      assert.strictEqual(t1.id, 1);
      assert.strictEqual(t2.id, 2);
    },
  );

  await t.test(
    '7. Resolving request-scoped provider without active scope throws ScopeError',
    async () => {
      class ScopedService {}

      const container = new ContainerBuilder()
        .registerClass(ScopedService, ScopedService, 'REQUEST')
        .build();

      container.makeReady();

      await assert.rejects(async () => {
        await container.resolve(ScopedService);
      }, ScopeError);
    },
  );

  await t.test(
    '8. Circular dependency detection throws CircularDependencyError with exact path (A -> B -> C -> A)',
    async () => {
      class ServiceA {}
      class ServiceB {}
      class ServiceC {}

      const container = new ContainerBuilder()
        .registerClass(ServiceA, ServiceA, 'SINGLETON', [ServiceB])
        .registerClass(ServiceB, ServiceB, 'SINGLETON', [ServiceC])
        .registerClass(ServiceC, ServiceC, 'SINGLETON', [ServiceA])
        .build();

      container.makeReady();

      await assert.rejects(
        async () => {
          await container.resolve(ServiceA);
        },
        (err: unknown) => {
          assert.ok(err instanceof CircularDependencyError);
          assert.deepStrictEqual(err.dependencyPath, [
            'ServiceA',
            'ServiceB',
            'ServiceC',
            'ServiceA',
          ]);
          return true;
        },
      );
    },
  );

  await t.test('9. Lifecycle hooks: onInit() and onDestroy() execute exactly once', async () => {
    let initCount = 0;
    let destroyCount = 0;

    class LifecycleService implements OnInit, OnDestroy {
      public async onInit(): Promise<void> {
        initCount++;
      }

      public async onDestroy(): Promise<void> {
        destroyCount++;
      }
    }

    const container = new ContainerBuilder()
      .registerClass(LifecycleService, LifecycleService, 'REQUEST')
      .build();

    container.makeReady();

    const scope = container.createScope();

    const item1 = await scope.resolve(LifecycleService);
    const item2 = await scope.resolve(LifecycleService);

    assert.strictEqual(item1, item2);
    assert.strictEqual(initCount, 1, 'onInit must run exactly once');
    assert.strictEqual(destroyCount, 0);

    await scope.dispose();

    assert.strictEqual(destroyCount, 1, 'onDestroy must run on scope dispose');

    // Subsequent access on disposed scope throws ScopeError
    await assert.rejects(async () => {
      await scope.resolve(LifecycleService);
    }, ScopeError);
  });

  await t.test(
    '10. Container lifecycle state transitions and resolution blocking during stopping/stopped',
    async () => {
      class TestService {}

      const container = new ContainerBuilder()
        .registerClass(TestService, TestService, 'SINGLETON')
        .build();

      // Before ready: resolve throws ContainerStateError
      await assert.rejects(async () => {
        await container.resolve(TestService);
      }, ContainerStateError);

      await container.start();

      const svc = await container.resolve(TestService);
      assert.ok(svc);

      // Registration after ready/start throws ContainerStateError
      assert.throws(() => {
        container.registerClass('LATE_TOKEN', TestService);
      }, ContainerStateError);

      await container.stop();

      // Resolution after stop throws ContainerStateError
      await assert.rejects(async () => {
        await container.resolve(TestService);
      }, ContainerStateError);
    },
  );

  await t.test(
    '11. Diagnostics snapshots track cache hits, misses, resolution counts, and hook timings',
    async () => {
      class CachedService implements OnInit {
        public onInit() {}
      }

      const container = new ContainerBuilder()
        .setOptions({ enableDiagnostics: true })
        .registerClass(CachedService, CachedService, 'SINGLETON')
        .build();

      container.makeReady();

      await container.resolve(CachedService);
      await container.resolve(CachedService);
      await container.resolve(CachedService);

      const diag = container.diagnostics;

      assert.strictEqual(diag.providerCount, 1);
      assert.strictEqual(diag.resolutionCount, 3);
      assert.strictEqual(diag.cacheHits, 2);
      assert.strictEqual(diag.cacheMisses, 1);
      assert.strictEqual(diag.singletonCount, 1);
      assert.strictEqual(diag.resolutionFailures, 0);
      assert.ok(diag.totalLifecycleHookDurationMs >= 0);
      assert.ok(Object.isFrozen(diag));
    },
  );

  await t.test(
    '12. 1,000 parallel resolutions verify complete request-scope isolation and context safety',
    async () => {
      let instanceCounter = 0;

      class RequestScopedState {
        public readonly instanceId = ++instanceCounter;
      }

      class RequestScopedHandler {
        constructor(public readonly state: RequestScopedState) {}
      }

      const container = new ContainerBuilder()
        .registerClass(RequestScopedState, RequestScopedState, 'REQUEST')
        .registerClass(RequestScopedHandler, RequestScopedHandler, 'REQUEST', [RequestScopedState])
        .build();

      container.makeReady();

      const parallelTasks = Array.from({ length: 1000 }, () => {
        return async () => {
          const scope = container.createScope();

          const handler1 = await scope.resolve(RequestScopedHandler);
          const handler2 = await scope.resolve(RequestScopedHandler);
          const state = await scope.resolve(RequestScopedState);

          assert.strictEqual(
            handler1,
            handler2,
            'Within the same request scope, resolved instances must be identical',
          );
          assert.strictEqual(
            handler1.state,
            state,
            'Scoped dependency must match directly resolved scoped instance',
          );

          await scope.dispose();

          return handler1.state.instanceId;
        };
      });

      const instanceIds = await Promise.all(parallelTasks.map((task) => task()));
      const uniqueIds = new Set(instanceIds);

      assert.strictEqual(
        uniqueIds.size,
        1000,
        '1000 separate request scopes must produce 1000 unique instance IDs',
      );
    },
  );

  await t.test(
    '13. Full End-to-End Pipeline Integration: MetadataRegistry -> Discovery -> Compiler -> Scanner -> Assembler -> Runtime Initializer -> ProviderDescriptor -> DI Container -> Runtime Orchestrator',
    async () => {
      // 1. Authoritative MetadataRegistry
      const metadataBuilder = new MetadataBuilder();
      const metadataRegistry = new MetadataRegistry(metadataBuilder.build());

      // Module, Controller, Provider metadata
      metadataRegistry.register({
        id: 'module:MainAppModule',
        type: MetadataType.MODULE,
      });

      metadataRegistry.register({
        id: 'controller:UsersController',
        type: MetadataType.CONTROLLER,
        parentId: 'module:MainAppModule',
      });

      metadataRegistry.register({
        id: 'provider:UsersService',
        type: MetadataType.PROVIDER,
        parentId: 'module:MainAppModule',
      });

      metadataRegistry.register({
        id: 'route:UsersController:getUsers:GET:/users',
        type: MetadataType.ROUTE,
        parentId: 'controller:UsersController',
      });

      metadataRegistry.makeReady();

      // 2. Discovery Engine
      const discoveryBuilder = new DiscoveryBuilder().setMetadataRegistry(metadataRegistry);
      const discoveryEngine = new DiscoveryEngine(discoveryBuilder.build());
      const discoveryResult = await discoveryEngine.discover();

      // 3. Module Compiler
      const compilerBuilder = new CompilerBuilder();
      const compiler = new ModuleCompiler(compilerBuilder.build());
      const compilationResult = await compiler.compile(discoveryResult);

      // 4. Application Scanner
      const scannerBuilder = new ScannerBuilder();
      const scanner = new ApplicationScanner(scannerBuilder.build());
      const scanResult = await scanner.scan(compilationResult);

      // 5. Runtime Assembler
      const assemblerBuilder = new AssemblerBuilder();
      const assembler = new RuntimeAssembler(assemblerBuilder.build());
      const assemblyResult = await assembler.assemble(scanResult);

      // 6. Runtime Initializer
      const initializerBuilder = new RuntimeInitializerBuilder();
      const initializer = new RuntimeInitializer(initializerBuilder.build());
      const initResult = await initializer.initialize(assemblyResult.runtime);

      // 7. DI Container runtime resolution from assembly
      class UsersService {
        public getUsers() {
          return [{ id: '1', name: 'Alice' }];
        }
      }

      class UsersController {
        constructor(public readonly usersService: UsersService) {}
      }

      const diContainer = new ContainerBuilder()
        .registerClass('UsersService', UsersService, 'SINGLETON')
        .registerClass('UsersController', UsersController, 'SINGLETON', ['UsersService'])
        .build();

      diContainer.makeReady();

      const resolvedController = await diContainer.resolve<UsersController>('UsersController');

      assert.ok(resolvedController);
      assert.ok(resolvedController.usersService);
      assert.deepStrictEqual(resolvedController.usersService.getUsers(), [
        { id: '1', name: 'Alice' },
      ]);

      // 8. Runtime Orchestrator
      const orchestratorBuilder = new RuntimeOrchestratorBuilder();
      const orchestrator = new RuntimeOrchestrator(orchestratorBuilder.build());
      const execResult = await orchestrator.start(initResult.runtime);
      assert.strictEqual(execResult.started, true);

      await orchestrator.stop();
      await diContainer.stop();
    },
  );
});
