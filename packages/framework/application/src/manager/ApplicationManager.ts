import type {
  ApplicationDiagnosticsSnapshot,
  ApplicationManager as IApplicationManager,
  ApplicationResult,
  ApplicationService,
  ApplicationServiceOptions,
} from '@coreforge/contracts';
import { Dispatcher } from '@coreforge/dispatch';
import { ExecutionEngine } from '@coreforge/execution';
import { ExecutionContextManager } from '@coreforge/execution-context';
import { InterceptorEngine } from '@coreforge/interceptors';
import { QueryBus } from '@coreforge/query';

import { ApplicationDiagnostics } from '../diagnostics/ApplicationDiagnostics';
import { ApplicationExecutor } from '../executor/ApplicationExecutor';
import { ApplicationLifecycleManager } from '../lifecycle/ApplicationLifecycleManager';
import { CommandOrchestrator } from '../orchestration/CommandOrchestrator';
import { OperationCoordinator } from '../orchestration/OperationCoordinator';
import { QueryOrchestrator } from '../orchestration/QueryOrchestrator';
import { ApplicationServiceRegistry } from '../registry/ApplicationServiceRegistry';
import { ApplicationManagerOptions, ApplicationState } from '../types/applicationTypes';

export class ApplicationManager implements IApplicationManager {
  private readonly _lifecycle: ApplicationLifecycleManager;
  private readonly _contextManager: ExecutionContextManager;
  private readonly _executionEngine: ExecutionEngine;
  private readonly _interceptorEngine: InterceptorEngine;
  private readonly _dispatcher: Dispatcher;
  private readonly _queryBus: QueryBus;
  private readonly _commandOrchestrator: CommandOrchestrator;
  private readonly _queryOrchestrator: QueryOrchestrator;
  private readonly _coordinator: OperationCoordinator;
  private readonly _registry: ApplicationServiceRegistry;
  private readonly _diagnostics: ApplicationDiagnostics;
  private readonly _executor: ApplicationExecutor;

  constructor(options: ApplicationManagerOptions = {}) {
    this._lifecycle = new ApplicationLifecycleManager();
    this._contextManager = options.contextManager ?? new ExecutionContextManager();
    this._executionEngine = options.executionEngine ?? new ExecutionEngine({ autoStart: false });
    this._interceptorEngine =
      options.interceptorEngine ?? new InterceptorEngine({ autoStart: false });
    this._dispatcher =
      options.dispatcher ??
      new Dispatcher({ contextManager: this._contextManager, autoStart: false });
    this._queryBus =
      options.queryBus ?? new QueryBus({ contextManager: this._contextManager, autoStart: false });
    this._diagnostics = new ApplicationDiagnostics();

    this._commandOrchestrator = new CommandOrchestrator(this._dispatcher);
    this._queryOrchestrator = new QueryOrchestrator(this._queryBus);
    this._coordinator = new OperationCoordinator(
      this._commandOrchestrator,
      this._queryOrchestrator,
      this._contextManager,
      this._diagnostics,
    );

    this._registry = new ApplicationServiceRegistry();

    this._executor = new ApplicationExecutor(
      this._contextManager,
      this._executionEngine,
      this._interceptorEngine,
      this._lifecycle,
      this._registry,
      this._diagnostics,
    );

    const autoStart = options.autoStart ?? false;
    if (autoStart) {
      this.startSync();
    }
  }

  public get ready(): boolean {
    return this._lifecycle.isReady;
  }

  public get state(): ApplicationState {
    return this._lifecycle.state;
  }

  public get executionEngine(): ExecutionEngine {
    return this._executionEngine;
  }

  public get interceptorEngine(): InterceptorEngine {
    return this._interceptorEngine;
  }

  public get dispatcher(): Dispatcher {
    return this._dispatcher;
  }

  public get queryBus(): QueryBus {
    return this._queryBus;
  }

  public get coordinator(): OperationCoordinator {
    return this._coordinator;
  }

  public startSync(): void {
    if (!this._executionEngine.ready) {
      this._executionEngine.start();
    }
    if (!this._interceptorEngine.ready) {
      this._interceptorEngine.start();
    }
    if (!this._dispatcher.ready) {
      this._dispatcher.startSync();
    }
    if (!this._queryBus.ready) {
      this._queryBus.startSync();
    }
    this._lifecycle.start();
    this._registry.lock();
  }

  public async start(): Promise<void> {
    this.startSync();
  }

  public async stop(): Promise<void> {
    this._lifecycle.transitionToStopping();
    await this._queryBus.stop();
    await this._dispatcher.stop();
    await this._interceptorEngine.stop();
    this._executionEngine.stop();
    this._lifecycle.transitionToStopped();
  }

  public register<TInput = unknown, TResult = unknown>(
    type: string,
    service: ApplicationService<TInput, TResult>,
  ): void {
    try {
      this._lifecycle.ensureCanRegister();
      this._registry.register(type, service);
    } catch (err: unknown) {
      this._diagnostics.recordRegistrationFailure();
      throw err;
    }
  }

  public async execute<TInput = unknown, TResult = unknown>(
    type: string,
    input: TInput,
    options?: ApplicationServiceOptions,
  ): Promise<ApplicationResult<TResult>> {
    return this._executor.execute(type, input, options);
  }

  public getDiagnostics(): ApplicationDiagnosticsSnapshot {
    return this._diagnostics.getSnapshot();
  }

  public resetDiagnostics(): void {
    this._diagnostics.reset();
  }
}
