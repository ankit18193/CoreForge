import type {
  Query,
  QueryBus as IQueryBus,
  QueryDiagnosticsSnapshot,
  QueryHandler,
  QueryOptions,
  QueryResult,
} from '@coreforge/contracts';
import { ExecutionEngine } from '@coreforge/execution';
import { ExecutionContextManager } from '@coreforge/execution-context';
import { InterceptorEngine } from '@coreforge/interceptors';

import { QueryDiagnostics } from '../diagnostics/QueryDiagnostics';
import { QueryExecutor } from '../executor/QueryExecutor';
import { QueryLifecycleManager } from '../lifecycle/QueryLifecycleManager';
import { QueryHandlerRegistry } from '../registry/QueryHandlerRegistry';
import { QueryBusOptions, QueryState } from '../types/queryTypes';

export class QueryBus implements IQueryBus {
  private readonly _lifecycle: QueryLifecycleManager;
  private readonly _contextManager: ExecutionContextManager;
  private readonly _executionEngine: ExecutionEngine;
  private readonly _interceptorEngine: InterceptorEngine;
  private readonly _registry: QueryHandlerRegistry;
  private readonly _diagnostics: QueryDiagnostics;
  private readonly _executor: QueryExecutor;

  constructor(options: QueryBusOptions = {}) {
    this._lifecycle = new QueryLifecycleManager();
    this._contextManager = options.contextManager ?? new ExecutionContextManager();
    this._executionEngine = options.executionEngine ?? new ExecutionEngine({ autoStart: false });
    this._interceptorEngine =
      options.interceptorEngine ?? new InterceptorEngine({ autoStart: false });
    this._registry = new QueryHandlerRegistry();
    this._diagnostics = new QueryDiagnostics();

    this._executor = new QueryExecutor(
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

  public get state(): QueryState {
    return this._lifecycle.state;
  }

  public get executionEngine(): ExecutionEngine {
    return this._executionEngine;
  }

  public get interceptorEngine(): InterceptorEngine {
    return this._interceptorEngine;
  }

  public startSync(): void {
    if (!this._executionEngine.ready) {
      this._executionEngine.start();
    }
    if (!this._interceptorEngine.ready) {
      this._interceptorEngine.start();
    }
    this._lifecycle.start();
    this._registry.lock();
  }

  public async start(): Promise<void> {
    this.startSync();
  }

  public async stop(): Promise<void> {
    this._lifecycle.transitionToStopping();
    await this._interceptorEngine.stop();
    this._executionEngine.stop();
    this._lifecycle.transitionToStopped();
  }

  public register<TPayload = unknown, TResult = unknown>(
    type: string,
    handler: QueryHandler<TPayload, TResult>,
  ): void {
    try {
      this._lifecycle.ensureCanRegister();
      this._registry.register(type, handler);
    } catch (err: unknown) {
      this._diagnostics.recordRegistrationFailure();
      throw err;
    }
  }

  public async query<TPayload = unknown, TResult = unknown>(
    query: Query<TPayload>,
    options?: QueryOptions,
  ): Promise<QueryResult<TResult>> {
    return this._executor.execute(query, options);
  }

  public getDiagnostics(): QueryDiagnosticsSnapshot {
    return this._diagnostics.getSnapshot();
  }

  public resetDiagnostics(): void {
    this._diagnostics.reset();
  }
}
