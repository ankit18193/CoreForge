import type { Command, DispatchOptions, DispatchResult } from '@coreforge/contracts';
import { ExecutionCancellationError, ExecutionEngine } from '@coreforge/execution';
import { ExecutionContextManager } from '@coreforge/execution-context';
import { InterceptorEngine } from '@coreforge/interceptors';

import { CommandSnapshot } from '../command/CommandSnapshot';
import { DispatchDiagnostics } from '../diagnostics/DispatchDiagnostics';
import { DispatchCancellationError, HandlerNotFoundError } from '../errors/DispatchErrors';
import { DispatchProfiler } from '../internal/DispatchProfiler';
import { DispatchLifecycleManager } from '../lifecycle/DispatchLifecycleManager';
import { CommandHandlerRegistry } from '../registry/CommandHandlerRegistry';
import { HandlerResolver } from '../registry/HandlerResolver';
import { DispatchResultFactory } from '../result/DispatchResultFactory';

export class DispatchExecutor {
  private readonly _contextManager: ExecutionContextManager;
  private readonly _executionEngine: ExecutionEngine;
  private readonly _interceptorEngine: InterceptorEngine;
  private readonly _lifecycle: DispatchLifecycleManager;
  private readonly _registry: CommandHandlerRegistry;
  private readonly _diagnostics: DispatchDiagnostics;

  constructor(
    contextManager: ExecutionContextManager,
    executionEngine: ExecutionEngine,
    interceptorEngine: InterceptorEngine,
    lifecycle: DispatchLifecycleManager,
    registry: CommandHandlerRegistry,
    diagnostics: DispatchDiagnostics,
  ) {
    this._contextManager = contextManager;
    this._executionEngine = executionEngine;
    this._interceptorEngine = interceptorEngine;
    this._lifecycle = lifecycle;
    this._registry = registry;
    this._diagnostics = diagnostics;
  }

  public async execute<TPayload, TResult>(
    command: Command<TPayload>,
    options?: DispatchOptions,
  ): Promise<DispatchResult<TResult>> {
    this._lifecycle.ensureReadyForDispatch();

    const snapshot = CommandSnapshot.create(command);

    let handler;
    try {
      handler = HandlerResolver.resolve<TPayload, TResult>(this._registry, snapshot.type);
    } catch (err: unknown) {
      if (err instanceof HandlerNotFoundError) {
        this._diagnostics.recordHandlerNotFound();
      }
      throw err;
    }

    const context = options?.context ?? this._contextManager.create({ autoStart: true });
    if (context.state === 'CREATED') {
      context.start();
    }

    const profiler = new DispatchProfiler().start();
    this._diagnostics.recordDispatchStarted();

    return this._contextManager.run(context, async () => {
      if (context.signal.aborted) {
        const durationMs = Math.round(profiler.elapsedMs * 100) / 100;
        this._diagnostics.recordDispatchCancelled(durationMs);
        return DispatchResultFactory.createCancelled<TResult>(
          snapshot.type,
          context.executionId,
          new DispatchCancellationError('Execution context was aborted before command dispatch'),
          durationMs,
        );
      }

      try {
        let handlerExecuted = false;

        const interceptorResult = await this._interceptorEngine.execute(
          snapshot.payload,
          async (interceptorInput, interceptorCtx) => {
            const execResult = await this._executionEngine.execute(
              interceptorInput,
              async (execInput, execCtx) => {
                if (!handlerExecuted) {
                  handlerExecuted = true;
                  this._diagnostics.recordHandlerExecuted();
                }
                return handler.execute(execInput as TPayload, execCtx);
              },
              { context: interceptorCtx },
            );

            if (!execResult.success) {
              throw execResult.error;
            }

            return execResult.value as TResult;
          },
          { context },
        );

        context.complete();
        const durationMs = Math.round(profiler.elapsedMs * 100) / 100;
        this._diagnostics.recordDispatchCompleted(durationMs);

        return DispatchResultFactory.createCompleted<TResult>(
          snapshot.type,
          context.executionId,
          interceptorResult.value,
          durationMs,
        );
      } catch (err: unknown) {
        const durationMs = Math.round(profiler.elapsedMs * 100) / 100;

        if (
          context.signal.aborted ||
          err instanceof DispatchCancellationError ||
          err instanceof ExecutionCancellationError
        ) {
          context.cancel();
          this._diagnostics.recordDispatchCancelled(durationMs);
          return DispatchResultFactory.createCancelled<TResult>(
            snapshot.type,
            context.executionId,
            err,
            durationMs,
          );
        }

        context.fail();
        this._diagnostics.recordHandlerFailed();
        this._diagnostics.recordDispatchFailed(durationMs);
        return DispatchResultFactory.createFailed<TResult>(
          snapshot.type,
          context.executionId,
          err,
          durationMs,
        );
      }
    });
  }
}
