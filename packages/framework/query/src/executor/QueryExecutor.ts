import type { Query, QueryOptions, QueryResult } from '@coreforge/contracts';
import { ExecutionCancellationError, ExecutionEngine } from '@coreforge/execution';
import { ExecutionContextManager } from '@coreforge/execution-context';
import { InterceptorEngine } from '@coreforge/interceptors';

import { QueryDiagnostics } from '../diagnostics/QueryDiagnostics';
import { QueryCancellationError, QueryHandlerNotFoundError } from '../errors/QueryErrors';
import { QueryProfiler } from '../internal/QueryProfiler';
import { QueryLifecycleManager } from '../lifecycle/QueryLifecycleManager';
import { QuerySnapshot } from '../query/QuerySnapshot';
import { QueryHandlerRegistry } from '../registry/QueryHandlerRegistry';
import { QueryHandlerResolver } from '../registry/QueryHandlerResolver';
import { QueryResultFactory } from '../result/QueryResultFactory';

export class QueryExecutor {
  private readonly _contextManager: ExecutionContextManager;
  private readonly _executionEngine: ExecutionEngine;
  private readonly _interceptorEngine: InterceptorEngine;
  private readonly _lifecycle: QueryLifecycleManager;
  private readonly _registry: QueryHandlerRegistry;
  private readonly _diagnostics: QueryDiagnostics;

  constructor(
    contextManager: ExecutionContextManager,
    executionEngine: ExecutionEngine,
    interceptorEngine: InterceptorEngine,
    lifecycle: QueryLifecycleManager,
    registry: QueryHandlerRegistry,
    diagnostics: QueryDiagnostics,
  ) {
    this._contextManager = contextManager;
    this._executionEngine = executionEngine;
    this._interceptorEngine = interceptorEngine;
    this._lifecycle = lifecycle;
    this._registry = registry;
    this._diagnostics = diagnostics;
  }

  public async execute<TPayload, TResult>(
    query: Query<TPayload>,
    options?: QueryOptions,
  ): Promise<QueryResult<TResult>> {
    this._lifecycle.ensureReadyForQuery();

    const snapshot = QuerySnapshot.create(query);

    let handler;
    try {
      handler = QueryHandlerResolver.resolve<TPayload, TResult>(this._registry, snapshot.type);
    } catch (err: unknown) {
      if (err instanceof QueryHandlerNotFoundError) {
        this._diagnostics.recordHandlerNotFound();
      }
      throw err;
    }

    const context = options?.context ?? this._contextManager.create({ autoStart: true });
    if (context.state === 'CREATED') {
      context.start();
    }

    const profiler = new QueryProfiler().start();
    this._diagnostics.recordQueryStarted();

    return this._contextManager.run(context, async () => {
      if (context.signal.aborted) {
        const durationMs = Math.round(profiler.elapsedMs * 100) / 100;
        this._diagnostics.recordQueryCancelled(durationMs);
        return QueryResultFactory.createCancelled<TResult>(
          snapshot.type,
          context.executionId,
          new QueryCancellationError('Execution context was aborted before query execution'),
          durationMs,
        );
      }

      try {
        let handlerExecuted = false;

        const execResult = await this._executionEngine.execute(
          snapshot.payload,
          async (execInput, execCtx) => {
            const interceptorResult = await this._interceptorEngine.execute(
              execInput,
              async (interceptorInput, interceptorCtx) => {
                if (!handlerExecuted) {
                  handlerExecuted = true;
                  this._diagnostics.recordHandlerExecuted();
                }
                return handler.execute(interceptorInput as TPayload, interceptorCtx);
              },
              { context: execCtx },
            );

            return interceptorResult.value as TResult;
          },
          { context },
        );

        if (!execResult.success) {
          throw execResult.error;
        }

        context.complete();
        const durationMs = Math.round(profiler.elapsedMs * 100) / 100;
        this._diagnostics.recordQueryCompleted(durationMs);

        return QueryResultFactory.createCompleted<TResult>(
          snapshot.type,
          context.executionId,
          execResult.value as TResult,
          durationMs,
        );
      } catch (err: unknown) {
        const durationMs = Math.round(profiler.elapsedMs * 100) / 100;

        if (
          context.signal.aborted ||
          err instanceof QueryCancellationError ||
          err instanceof ExecutionCancellationError
        ) {
          context.cancel();
          this._diagnostics.recordQueryCancelled(durationMs);
          return QueryResultFactory.createCancelled<TResult>(
            snapshot.type,
            context.executionId,
            err,
            durationMs,
          );
        }

        context.fail();
        this._diagnostics.recordHandlerFailed();
        this._diagnostics.recordQueryFailed(durationMs);
        return QueryResultFactory.createFailed<TResult>(
          snapshot.type,
          context.executionId,
          err,
          durationMs,
        );
      }
    });
  }
}
