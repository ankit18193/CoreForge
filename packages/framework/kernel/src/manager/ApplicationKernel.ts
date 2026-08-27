import { ApplicationManager } from '@coreforge/application';
import { Dispatcher } from '@coreforge/dispatch';
import { EventPublisher } from '@coreforge/events';
import { ExecutionEngine } from '@coreforge/execution';
import { ExecutionContextManager } from '@coreforge/execution-context';
import { QueryBus } from '@coreforge/query';

import { KernelDiagnostics } from '../diagnostics/KernelDiagnostics';
import { KernelExecutionCoordinator } from '../execution/KernelExecutionCoordinator';
import { KernelLifecycleManager } from '../lifecycle/KernelLifecycleManager';
import { KernelStartupCoordinator } from '../lifecycle/KernelStartupCoordinator';
import { KernelComponentRegistry } from '../registry/KernelComponentRegistry';
import { KernelShutdownCoordinator } from '../shutdown/KernelShutdownCoordinator';
import {
  ApplicationKernelConfig,
  ApplicationResult,
  ApplicationServiceOptions,
  Command,
  DispatchOptions,
  DispatchResult,
  ErrorHandlingEngine,
  Event,
  EventPublishOptions,
  EventPublishResult,
  ExecutionHandler,
  ExecutionOptions,
  ExecutionResult,
  IApplicationKernel,
  KernelComponent,
  KernelComponentOptions,
  KernelDiagnosticsSnapshot,
  KernelStartOptions,
  KernelState,
  KernelStopOptions,
  Query,
  QueryOptions,
  QueryResult,
} from '../types/kernelTypes';

export class ApplicationKernel implements IApplicationKernel {
  private readonly _lifecycle: KernelLifecycleManager;
  private readonly _registry: KernelComponentRegistry;
  private readonly _diagnostics: KernelDiagnostics;
  private readonly _contextManager: ExecutionContextManager;
  private readonly _executionEngine: ExecutionEngine;
  private readonly _dispatcher: Dispatcher;
  private readonly _queryBus: QueryBus;
  private readonly _eventPublisher: EventPublisher;
  private readonly _applicationManager: ApplicationManager;
  private readonly _errorEngine?: ErrorHandlingEngine | undefined;
  private readonly _config: ApplicationKernelConfig;

  constructor(config: ApplicationKernelConfig = {}) {
    this._lifecycle = new KernelLifecycleManager();
    this._registry = new KernelComponentRegistry();
    this._diagnostics = new KernelDiagnostics();

    this._contextManager = config.contextManager ?? new ExecutionContextManager();
    this._executionEngine =
      config.executionEngine ?? new ExecutionEngine({ contextManager: this._contextManager });
    this._dispatcher =
      config.dispatcher ??
      new Dispatcher({
        contextManager: this._contextManager,
        executionEngine: this._executionEngine,
      });
    this._queryBus =
      config.queryBus ??
      new QueryBus({
        contextManager: this._contextManager,
        executionEngine: this._executionEngine,
      });
    this._eventPublisher =
      config.eventPublisher ??
      new EventPublisher({
        contextManager: this._contextManager,
        executionEngine: this._executionEngine,
      });
    this._applicationManager =
      config.applicationManager ??
      new ApplicationManager({
        contextManager: this._contextManager,
        executionEngine: this._executionEngine,
        dispatcher: this._dispatcher,
        queryBus: this._queryBus,
      });
    this._errorEngine = config.errorEngine;
    this._config = Object.freeze({ ...config });

    if (config.components) {
      for (const component of config.components) {
        this.registerComponent(component);
      }
    }

    if (config.autoStart) {
      this._lifecycle.transitionToInitializing();
      this._registry.lock();
      this._lifecycle.transitionToReady();
    }
  }

  public get state(): KernelState {
    return this._lifecycle.state;
  }

  public get ready(): boolean {
    return this._lifecycle.isReady;
  }

  public async start(options?: KernelStartOptions): Promise<void> {
    if (this._lifecycle.isReady) {
      return; // Idempotent
    }

    this._lifecycle.transitionToInitializing();
    this._registry.lock();

    try {
      // Start infrastructure components
      if (!this._contextManager.ready) {
        await this._contextManager.start();
      }
      if (!this._executionEngine.ready) {
        await this._executionEngine.start();
      }
      if (!this._dispatcher.ready) {
        await this._dispatcher.start();
      }
      if (!this._queryBus.ready) {
        await this._queryBus.start();
      }
      if (!this._eventPublisher.ready) {
        await this._eventPublisher.start();
      }
      if (!this._applicationManager.ready) {
        await this._applicationManager.start();
      }
      if (this._errorEngine && !this._errorEngine.ready) {
        await this._errorEngine.start();
      }

      // Start custom registered kernel components in dependency order
      await KernelStartupCoordinator.start(this._registry, this._diagnostics, options);

      this._lifecycle.transitionToReady();
    } catch (err) {
      this._lifecycle.transitionToStopped();
      throw err;
    }
  }

  public async stop(options?: KernelStopOptions): Promise<void> {
    if (this._lifecycle.isStopped) {
      return; // Idempotent
    }

    this._lifecycle.transitionToStopping();

    const effectiveOptions: KernelStopOptions = {
      graceful: options?.graceful ?? this._config.gracefulShutdown ?? true,
      timeoutMs: options?.timeoutMs ?? this._config.shutdownTimeoutMs ?? 5000,
      force: options?.force ?? false,
    };

    try {
      // Stop custom registered kernel components in reverse order
      await KernelShutdownCoordinator.stop(this._registry, this._diagnostics, effectiveOptions);

      // Stop infrastructure components in reverse dependency order
      if (this._errorEngine && this._errorEngine.ready) {
        await this._errorEngine.stop();
      }
      if (this._applicationManager.ready) {
        await this._applicationManager.stop();
      }
      if (this._eventPublisher.ready) {
        await this._eventPublisher.stop();
      }
      if (this._queryBus.ready) {
        await this._queryBus.stop();
      }
      if (this._dispatcher.ready) {
        await this._dispatcher.stop();
      }
      if (this._executionEngine.ready) {
        await this._executionEngine.stop();
      }
      if (this._contextManager.ready) {
        await this._contextManager.stop();
      }
    } finally {
      this._lifecycle.transitionToStopped();
    }
  }

  public registerComponent(component: KernelComponent, options?: KernelComponentOptions): void {
    this._lifecycle.ensureCanRegister();
    try {
      this._registry.register(component, options);
    } catch (err) {
      this._diagnostics.recordRegistrationFailure();
      throw err;
    }
  }

  public async dispatch<TPayload = unknown, TResult = unknown>(
    command: Command<TPayload>,
    options?: DispatchOptions,
  ): Promise<DispatchResult<TResult>> {
    this._lifecycle.ensureReadyForOperations();
    return KernelExecutionCoordinator.dispatch<TPayload, TResult>(
      command,
      options,
      this._dispatcher,
      this._contextManager,
      this._diagnostics,
      this._errorEngine,
    );
  }

  public async query<TPayload = unknown, TResult = unknown>(
    query: Query<TPayload>,
    options?: QueryOptions,
  ): Promise<QueryResult<TResult>> {
    this._lifecycle.ensureReadyForOperations();
    return KernelExecutionCoordinator.query<TPayload, TResult>(
      query,
      options,
      this._queryBus,
      this._contextManager,
      this._diagnostics,
      this._errorEngine,
    );
  }

  public async publish<TPayload = unknown>(
    event: Event<TPayload>,
    options?: EventPublishOptions,
  ): Promise<EventPublishResult> {
    this._lifecycle.ensureReadyForOperations();
    return KernelExecutionCoordinator.publish<TPayload>(
      event,
      options,
      this._eventPublisher,
      this._contextManager,
      this._diagnostics,
      this._errorEngine,
    );
  }

  public async executeService<TInput = unknown, TResult = unknown>(
    serviceName: string,
    input: TInput,
    options?: ApplicationServiceOptions,
  ): Promise<ApplicationResult<TResult>> {
    this._lifecycle.ensureReadyForOperations();
    return KernelExecutionCoordinator.executeService<TInput, TResult>(
      serviceName,
      input,
      options,
      this._applicationManager,
      this._contextManager,
      this._diagnostics,
      this._errorEngine,
    );
  }

  public async execute<TInput = unknown, TOutput = unknown>(
    input: TInput,
    handler: ExecutionHandler<TInput, TOutput>,
    options?: ExecutionOptions,
  ): Promise<ExecutionResult<TOutput>> {
    this._lifecycle.ensureReadyForOperations();
    return KernelExecutionCoordinator.execute<TInput, TOutput>(
      input,
      handler,
      options,
      this._executionEngine,
      this._contextManager,
      this._diagnostics,
      this._errorEngine,
    );
  }

  public getDiagnostics(): KernelDiagnosticsSnapshot {
    return this._diagnostics.getSnapshot();
  }

  public resetDiagnostics(): void {
    this._diagnostics.reset();
  }
}
