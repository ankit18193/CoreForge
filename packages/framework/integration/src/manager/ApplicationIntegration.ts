import { ApplicationManager } from '@coreforge/application';
import { Dispatcher } from '@coreforge/dispatch';
import { ErrorHandlingEngine } from '@coreforge/error-handling';
import { EventPublisher } from '@coreforge/events';
import { ExecutionEngine } from '@coreforge/execution';
import { ExecutionContextManager } from '@coreforge/execution-context';
import { HookManager } from '@coreforge/hooks';
import { InterceptorEngine } from '@coreforge/interceptors';
import { ApplicationKernel } from '@coreforge/kernel';
import { QueryBus } from '@coreforge/query';

import { IntegrationDiagnostics } from '../diagnostics/IntegrationDiagnostics';
import { IntegrationExecutionCoordinator } from '../execution/IntegrationExecutionCoordinator';
import { IntegrationLifecycleManager } from '../lifecycle/IntegrationLifecycleManager';
import {
  ApplicationInfrastructureGraph,
  ApplicationIntegrationOptions,
  ApplicationResult,
  ApplicationServiceOptions,
  Command,
  DispatchOptions,
  DispatchResult,
  Event,
  EventPublishOptions,
  EventPublishResult,
  ExecutionHandler,
  ExecutionOptions,
  ExecutionResult,
  IApplicationIntegration,
  IntegrationDiagnosticsSnapshot,
  IntegrationState,
  Query,
  QueryOptions,
  QueryResult,
} from '../types/integrationTypes';
import { InfrastructureFactory } from '../wiring/InfrastructureFactory';

export class ApplicationIntegration implements IApplicationIntegration {
  private readonly _graph: ApplicationInfrastructureGraph;
  private readonly _lifecycle: IntegrationLifecycleManager;
  private readonly _diagnostics: IntegrationDiagnostics;

  constructor(options: ApplicationIntegrationOptions = {}) {
    this._graph = InfrastructureFactory.createApplicationInfrastructure(options);
    this._lifecycle = new IntegrationLifecycleManager(this._graph);
    this._diagnostics = new IntegrationDiagnostics();

    if (options.autoStart) {
      // Synchronous kick-off if configured
      this.start().catch(() => {});
    }
  }

  public get ready(): boolean {
    return this._lifecycle.isReady;
  }

  public get state(): IntegrationState {
    return this._lifecycle.state;
  }

  public get contextManager(): ExecutionContextManager {
    return this._graph.contextManager;
  }

  public get executionEngine(): ExecutionEngine {
    return this._graph.executionEngine;
  }

  public get interceptorEngine(): InterceptorEngine {
    return this._graph.interceptorEngine;
  }

  public get dispatcher(): Dispatcher {
    return this._graph.dispatcher;
  }

  public get queryBus(): QueryBus {
    return this._graph.queryBus;
  }

  public get eventPublisher(): EventPublisher {
    return this._graph.eventPublisher;
  }

  public get applicationManager(): ApplicationManager {
    return this._graph.applicationManager;
  }

  public get errorEngine(): ErrorHandlingEngine {
    return this._graph.errorEngine;
  }

  public get hookManager(): HookManager {
    return this._graph.hookManager;
  }

  public get kernel(): ApplicationKernel {
    return this._graph.kernel;
  }

  public async start(): Promise<void> {
    if (this._lifecycle.isReady) {
      return; // Idempotent
    }
    this._diagnostics.recordStartupAttempt();
    try {
      await this._lifecycle.start();
      this._diagnostics.recordStartupSuccess();
    } catch (err) {
      this._diagnostics.recordStartupFailure();
      throw err;
    }
  }

  public async stop(): Promise<void> {
    if (this._lifecycle.isStopped) {
      return; // Idempotent
    }
    this._diagnostics.recordShutdownAttempt();
    try {
      await this._lifecycle.stop();
      this._diagnostics.recordShutdownSuccess();
    } catch (err) {
      this._diagnostics.recordShutdownFailure();
      throw err;
    }
  }

  public async dispatch<TPayload = unknown, TResult = unknown>(
    command: Command<TPayload>,
    options?: DispatchOptions,
  ): Promise<DispatchResult<TResult>> {
    this._lifecycle.ensureReadyForOperations();
    return IntegrationExecutionCoordinator.dispatch<TPayload, TResult>(
      this._graph.kernel,
      command,
      this._diagnostics,
      options,
    );
  }

  public async query<TPayload = unknown, TResult = unknown>(
    query: Query<TPayload>,
    options?: QueryOptions,
  ): Promise<QueryResult<TResult>> {
    this._lifecycle.ensureReadyForOperations();
    return IntegrationExecutionCoordinator.query<TPayload, TResult>(
      this._graph.kernel,
      query,
      this._diagnostics,
      options,
    );
  }

  public async publish<TPayload = unknown>(
    event: Event<TPayload>,
    options?: EventPublishOptions,
  ): Promise<EventPublishResult> {
    this._lifecycle.ensureReadyForOperations();
    return IntegrationExecutionCoordinator.publish<TPayload>(
      this._graph.kernel,
      event,
      this._diagnostics,
      options,
    );
  }

  public async executeService<TInput = unknown, TResult = unknown>(
    serviceName: string,
    input: TInput,
    options?: ApplicationServiceOptions,
  ): Promise<ApplicationResult<TResult>> {
    this._lifecycle.ensureReadyForOperations();
    return IntegrationExecutionCoordinator.executeService<TInput, TResult>(
      this._graph.kernel,
      serviceName,
      input,
      this._diagnostics,
      options,
    );
  }

  public async execute<TInput = unknown, TOutput = unknown>(
    input: TInput,
    handler: ExecutionHandler<TInput, TOutput>,
    options?: ExecutionOptions,
  ): Promise<ExecutionResult<TOutput>> {
    this._lifecycle.ensureReadyForOperations();
    return IntegrationExecutionCoordinator.execute<TInput, TOutput>(
      this._graph.kernel,
      input,
      handler,
      this._diagnostics,
      options,
    );
  }

  public getDiagnostics(): IntegrationDiagnosticsSnapshot {
    return this._diagnostics.getSnapshot();
  }

  public resetDiagnostics(): void {
    this._diagnostics.reset();
  }
}
