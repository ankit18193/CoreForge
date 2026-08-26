import type { ExecutionHandler, ExecutionOptions, ExecutionResult } from '@coreforge/contracts';
import { ExecutionContextManager } from '@coreforge/execution-context';

import { ExecutionDiagnostics } from '../diagnostics/ExecutionDiagnostics';
import { ExecutionCancellationError } from '../errors/ExecutionErrors';
import { ExecutionHandlerValidator } from '../handler/ExecutionHandler';
import { ExecutionProfiler } from '../internal/ExecutionProfiler';
import { ExecutionEngineLifecycleManager } from '../lifecycle/ExecutionEngineLifecycleManager';
import { MiddlewareChain } from '../middleware/MiddlewareChain';
import { MiddlewareRegistry } from '../middleware/MiddlewareRegistry';
import { ExecutionResultFactory } from '../result/ExecutionResult';

export class ExecutionCoordinator {
  private readonly _contextManager: ExecutionContextManager;
  private readonly _lifecycle: ExecutionEngineLifecycleManager;
  private readonly _middlewareRegistry: MiddlewareRegistry;
  private readonly _diagnostics: ExecutionDiagnostics;

  constructor(
    contextManager: ExecutionContextManager,
    lifecycle: ExecutionEngineLifecycleManager,
    middlewareRegistry: MiddlewareRegistry,
    diagnostics: ExecutionDiagnostics,
  ) {
    this._contextManager = contextManager;
    this._lifecycle = lifecycle;
    this._middlewareRegistry = middlewareRegistry;
    this._diagnostics = diagnostics;
  }

  public async execute<TInput, TResult>(
    input: TInput,
    handler: ExecutionHandler<TInput, TResult>,
    options?: ExecutionOptions,
  ): Promise<ExecutionResult<TResult>> {
    this._lifecycle.ensureReadyForExecution();
    const validHandler = ExecutionHandlerValidator.validate<TInput, TResult>(handler);

    const context = options?.context ?? this._contextManager.create({ autoStart: true });
    if (context.state === 'CREATED') {
      context.start();
    }

    const middlewares = this._middlewareRegistry.getSnapshot();
    const profiler = new ExecutionProfiler().start();

    this._diagnostics.recordExecutionStarted();

    return this._contextManager.run(context, async () => {
      try {
        if (context.signal.aborted) {
          throw new ExecutionCancellationError('Execution was cancelled before pipeline start');
        }

        const terminalHandler = async (): Promise<TResult> => {
          if (context.signal.aborted) {
            throw new ExecutionCancellationError(
              'Execution was cancelled before handler invocation',
            );
          }
          return validHandler(input, context);
        };

        const { result, handlerExecuted } = await MiddlewareChain.run(
          input,
          context,
          middlewares,
          terminalHandler,
          {
            onMiddlewareExecuted: () => this._diagnostics.recordMiddlewareExecuted(),
            onMiddlewareFailed: () => this._diagnostics.recordMiddlewareFailed(),
          },
        );

        if (handlerExecuted) {
          this._diagnostics.recordHandlerExecuted();
        } else {
          this._diagnostics.recordShortCircuit();
        }

        context.complete();
        const durationMs = Math.round(profiler.elapsedMs * 100) / 100;
        this._diagnostics.recordExecutionCompleted(durationMs);

        return ExecutionResultFactory.createSuccess(context.executionId, result, durationMs);
      } catch (err: unknown) {
        const isCancelled =
          context.signal.aborted ||
          err instanceof ExecutionCancellationError ||
          (typeof err === 'object' &&
            err !== null &&
            'code' in err &&
            (err as { code: string }).code === 'CF-EXECUTION-CANCELLATION');

        if (isCancelled) {
          context.cancel();
          const durationMs = Math.round(profiler.elapsedMs * 100) / 100;
          this._diagnostics.recordExecutionCancelled(durationMs);
          return ExecutionResultFactory.createCancelled(context.executionId, err, durationMs);
        }

        context.fail();
        const durationMs = Math.round(profiler.elapsedMs * 100) / 100;
        this._diagnostics.recordExecutionFailed(durationMs);
        return ExecutionResultFactory.createFailure(context.executionId, err, durationMs);
      }
    });
  }
}
