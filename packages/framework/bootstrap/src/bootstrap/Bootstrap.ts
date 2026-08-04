import { ConfigurationLoader, ConfigSchema, DefaultProvider, EnvProvider } from '@coreforge/config';
import { Container } from '@coreforge/container';
import { Bootstrap as IBootstrap, Logger, Module } from '@coreforge/contracts';
import { EventBus } from '@coreforge/events';
import {
  ConsoleReporter,
  ExceptionClassifier,
  ExceptionHandler,
  ExceptionMapper,
  ExceptionPipeline,
  FilterPipeline,
  LoggerReporter,
  ReporterPipeline,
} from '@coreforge/exceptions';
import { ConsoleWriter, LoggerBuilder, PrettyFormatter } from '@coreforge/logging';
import { ModuleConstructor, ModuleLoader } from '@coreforge/modules';
import { Runtime, RuntimeOptions } from '@coreforge/runtime';

import { BootstrapConfiguration } from './BootstrapConfiguration';
import { BootstrapDiagnostics } from '../diagnostics/BootstrapDiagnostics';
import { BootstrapInitializationError, BootstrapValidationError } from '../errors/BootstrapErrors';
import { LifecycleCoordinator } from '../lifecycle/LifecycleCoordinator';
import { ShutdownManager } from '../lifecycle/ShutdownManager';
import { StartupManager } from '../lifecycle/StartupManager';
import { BootstrapExecutionContext } from '../pipeline/BootstrapExecutionContext';
import { BootstrapPipeline } from '../pipeline/BootstrapPipeline';
import { BootstrapStage } from '../pipeline/BootstrapStage';
import { BootstrapState } from '../pipeline/BootstrapState';

export class Bootstrap implements IBootstrap {
  private readonly _configuration: BootstrapConfiguration;
  private readonly _coordinator: LifecycleCoordinator;
  private readonly _context: BootstrapExecutionContext;
  private readonly _pipeline: BootstrapPipeline;
  private _shutdownTimestamp = 0;

  constructor(configuration: BootstrapConfiguration) {
    this._configuration = configuration;
    this._context = new BootstrapExecutionContext();
    this._pipeline = new BootstrapPipeline();

    this.registerPipelineStages();

    const startupManager = new StartupManager(this._pipeline);
    const shutdownManager = new ShutdownManager();
    this._coordinator = new LifecycleCoordinator(startupManager, shutdownManager);
  }

  public get state(): BootstrapState {
    return this._coordinator.state;
  }

  public get pipeline(): BootstrapPipeline {
    return this._pipeline;
  }

  public get context(): BootstrapExecutionContext {
    return this._context;
  }

  public async start(): Promise<void> {
    await this._coordinator.start(this._context, this._configuration.startupTimeoutMs);
  }

  public async stop(): Promise<void> {
    this._shutdownTimestamp = Date.now();
    await this._coordinator.stop(this._context);
  }

  public get diagnostics(): BootstrapDiagnostics {
    const stats = this._context.profiler.getStats();

    const moduleLoader = this._context.registry.has('ModuleLoader')
      ? this._context.registry.get<ModuleLoader>('ModuleLoader')
      : undefined;
    const registeredModules = moduleLoader ? moduleLoader.discover() : [];

    const reporters = this._configuration.reporters.map((r) => r.name);
    const services = this._context.registry.keys();

    let eventHandlersCount = 0;
    if (this._context.registry.has('EventBus')) {
      const bus = this._context.registry.get<unknown>('EventBus') as Record<string, unknown>;
      if (bus && bus._registry) {
        const innerReg = bus._registry as Record<string, unknown>;
        if (innerReg && innerReg._registry instanceof Map) {
          eventHandlersCount = innerReg._registry.size;
        }
      }
    }

    return {
      startupDuration: stats.totalStartupTime,
      startupTimestamp: this._context.profiler.totalStartTime,
      shutdownTimestamp: this._shutdownTimestamp,
      frameworkVersion: '0.1.0',
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      processId: process.pid,
      memoryUsage: process.memoryUsage(),
      registeredModules,
      loadedFrameworkServices: services,
      registeredEventHandlers: eventHandlersCount,
      registeredReporters: reporters,
      configurationSource: this._configuration.configPath || 'providers',
    };
  }

  private registerPipelineStages(): void {
    // 1. ENVIRONMENT Stage
    this._pipeline.registerStage(BootstrapStage.ENVIRONMENT, {
      execute: () => {
        // Validation check
      },
    });

    // 2. CONFIGURATION Stage
    this._pipeline.registerStage(BootstrapStage.CONFIGURATION, {
      execute: async (ctx) => {
        const schema = new ConfigSchema();
        schema.addField('env', { type: 'string', required: true, default: 'development' });
        schema.addField('server.port', { type: 'number', required: true, default: 3000 });

        const loader = new ConfigurationLoader(schema);

        if (this._configuration.configProviders.length > 0) {
          for (const provider of this._configuration.configProviders) {
            loader.registerProvider(provider);
          }
        } else {
          loader.registerProvider(
            new DefaultProvider({
              env: 'development',
              'server.port': 3000,
            }),
          );
          loader.registerProvider(new EnvProvider({ 'server.port': 'CF_PORT' }));
        }

        const config = await loader.load();
        ctx.registry.set('Config', config);
      },
    });

    // 3. LOGGER Stage
    this._pipeline.registerStage(BootstrapStage.LOGGER, {
      execute: (ctx) => {
        const builder = new LoggerBuilder();
        builder.setFormatter(new PrettyFormatter());

        if (this._configuration.logWriters.length > 0) {
          for (const writer of this._configuration.logWriters) {
            builder.addWriter(writer as unknown as ConsoleWriter);
          }
        } else {
          builder.addWriter(new ConsoleWriter());
        }

        const logger = builder.build();
        ctx.registry.set('Logger', logger);
      },
    });

    // 4. EXCEPTION_HANDLER Stage
    this._pipeline.registerStage(BootstrapStage.EXCEPTION_HANDLER, {
      execute: (ctx) => {
        const logger = ctx.registry.get<Logger>('Logger');

        const mapper = new ExceptionMapper();
        const classifier = new ExceptionClassifier();
        const filterPipeline = new FilterPipeline();
        const reporterPipeline = new ReporterPipeline();

        reporterPipeline.addReporter(new LoggerReporter(logger));

        if (this._configuration.reporters.length > 0) {
          for (const r of this._configuration.reporters) {
            reporterPipeline.addReporter(r);
          }
        } else {
          reporterPipeline.addReporter(new ConsoleReporter());
        }

        const exceptionPipeline = new ExceptionPipeline({
          mapper,
          classifier,
          filterPipeline,
          reporterPipeline,
        });

        const handler = new ExceptionHandler(exceptionPipeline);
        ctx.registry.set('ExceptionHandler', handler);
      },
    });

    // 5. CONTAINER Stage
    this._pipeline.registerStage(BootstrapStage.CONTAINER, {
      execute: (ctx) => {
        const container = new Container();
        ctx.setContainer(container);
        ctx.registry.set('Container', container);

        const config = ctx.registry.get('Config');
        const logger = ctx.registry.get('Logger');
        const handler = ctx.registry.get('ExceptionHandler');

        container.registerValue('Config', config);
        container.registerValue('Logger', logger);
        container.registerValue('ExceptionHandler', handler);
        container.registerValue('Bootstrap', this);
      },
    });

    // 6. EVENT_BUS Stage
    this._pipeline.registerStage(BootstrapStage.EVENT_BUS, {
      execute: (ctx) => {
        const container = ctx.container;
        const eventBus = new EventBus();

        ctx.registry.set('EventBus', eventBus);
        container.registerValue('EventBus', eventBus);
      },
    });

    // 7. MODULE_REGISTRATION Stage
    this._pipeline.registerStage(BootstrapStage.MODULE_REGISTRATION, {
      execute: (ctx) => {
        const container = ctx.container;
        const moduleLoader = new ModuleLoader();

        ctx.registry.set('ModuleLoader', moduleLoader);
        container.registerValue('ModuleLoader', moduleLoader);

        for (const m of this._configuration.modules) {
          moduleLoader.register(m as Module | ModuleConstructor);
          if (typeof m === 'function') {
            container.registerSingleton(m.name, m as unknown as new (...args: never[]) => unknown);
          }
        }
      },
    });

    // 8. DEPENDENCY_VALIDATION Stage
    this._pipeline.registerStage(BootstrapStage.DEPENDENCY_VALIDATION, {
      execute: (ctx) => {
        const moduleLoader = ctx.registry.get<ModuleLoader>('ModuleLoader');
        try {
          moduleLoader.validate();
          moduleLoader.resolve();
        } catch (err: unknown) {
          const error = err instanceof Error ? err : new Error(String(err));
          throw new BootstrapValidationError(
            `Module dependency graph validation failed: ${error.message}`,
            error,
          );
        }
      },
    });

    // 9. MODULE_STARTUP Stage
    this._pipeline.registerStage(BootstrapStage.MODULE_STARTUP, {
      execute: async (ctx) => {
        const moduleLoader = ctx.registry.get<ModuleLoader>('ModuleLoader');
        const config = ctx.registry.get('Config');
        try {
          await moduleLoader.start(config);
        } catch (err: unknown) {
          const error = err instanceof Error ? err : new Error(String(err));
          throw new BootstrapInitializationError(
            `Module initialization failed during startup: ${error.message}`,
            error,
          );
        }
      },
    });

    // 10. RUNTIME_READY Stage
    this._pipeline.registerStage(BootstrapStage.RUNTIME_READY, {
      execute: async (ctx) => {
        const container = ctx.container;
        const logger = ctx.registry.get<Logger>('Logger');

        const config = ctx.registry.get<Record<string, unknown>>('Config');
        const runtimeOptions: RuntimeOptions = {
          environment: String(config.env || 'development'),
        };
        if (this._configuration.runtimeOptions.enableSignalHandlers !== undefined) {
          runtimeOptions.enableSignalHandlers =
            this._configuration.runtimeOptions.enableSignalHandlers as boolean;
        }
        if (this._configuration.runtimeOptions.shutdownTimeoutMs !== undefined) {
          runtimeOptions.shutdownTimeoutMs = this._configuration.runtimeOptions.shutdownTimeoutMs as number;
        }

        const runtime = new Runtime(runtimeOptions, logger);
        ctx.registry.set('Runtime', runtime);
        container.registerValue('Runtime', runtime);

        await runtime.start();
      },
    });
  }
}
