import type { ApplicationResult, ApplicationServiceOptions } from '@coreforge/contracts';
import { ExecutionCancellationError, ExecutionEngine } from '@coreforge/execution';
import { ExecutionContextManager } from '@coreforge/execution-context';
import { InterceptorEngine } from '@coreforge/interceptors';

import { ApplicationDiagnostics } from '../diagnostics/ApplicationDiagnostics';
import {
  ApplicationCancellationError,
  ApplicationServiceNotFoundError,
} from '../errors/ApplicationErrors';
import { ApplicationProfiler } from '../internal/ApplicationProfiler';
import { ApplicationLifecycleManager } from '../lifecycle/ApplicationLifecycleManager';
import { ApplicationServiceRegistry } from '../registry/ApplicationServiceRegistry';
import { ApplicationServiceResolver } from '../registry/ApplicationServiceResolver';
import { ApplicationResultFactory } from '../result/ApplicationResultFactory';
import { ApplicationInputSnapshot } from '../service/ApplicationInputSnapshot';
import { ApplicationServiceValidator } from '../service/ApplicationServiceValidator';

export class ApplicationExecutor {
  private readonly _contextManager: ExecutionContextManager;
  private readonly _executionEngine: ExecutionEngine;
  private readonly _interceptorEngine: InterceptorEngine;
  private readonly _lifecycle: ApplicationLifecycleManager;
  private readonly _registry: ApplicationServiceRegistry;
  private readonly _diagnostics: ApplicationDiagnostics;

  constructor(
    contextManager: ExecutionContextManager,
    executionEngine: ExecutionEngine,
    interceptorEngine: InterceptorEngine,
    lifecycle: ApplicationLifecycleManager,
    registry: ApplicationServiceRegistry,
    diagnostics: ApplicationDiagnostics,
  ) {
    this._contextManager = contextManager;
    this._executionEngine = executionEngine;
    this._interceptorEngine = interceptorEngine;
    this._lifecycle = lifecycle;
    this._registry = registry;
    this._diagnostics = diagnostics;
  }

  public async execute<TInput, TResult>(
    type: string,
    input: TInput,
    options?: ApplicationServiceOptions,
  ): Promise<ApplicationResult<TResult>> {
    this._lifecycle.ensureReadyForExecution();

    ApplicationServiceValidator.validateType(type);
    const snapshotInput = ApplicationInputSnapshot.create(input);

    let service;
    try {
      service = ApplicationServiceResolver.resolve<TInput, TResult>(this._registry, type);
    } catch (err: unknown) {
      if (err instanceof ApplicationServiceNotFoundError) {
        this._diagnostics.recordServiceNotFound();
      }
      throw err;
    }

    const context = options?.context ?? this._contextManager.create({ autoStart: true });
    if (context.state === 'CREATED') {
      context.start();
    }

    const profiler = new ApplicationProfiler().start();
    this._diagnostics.recordExecutionStarted();

    return this._contextManager.run(context, async () => {
      if (context.signal.aborted) {
        const durationMs = Math.round(profiler.elapsedMs * 100) / 100;
        this._diagnostics.recordExecutionCancelled(durationMs);
        return ApplicationResultFactory.createCancelled<TResult>(
          type,
          context.executionId,
          new ApplicationCancellationError(
            'Execution context was aborted before application service execution',
          ),
          durationMs,
        );
      }

      try {
        let serviceExecuted = false;

        const execResult = await this._executionEngine.execute(
          snapshotInput,
          async (execInput, execCtx) => {
            const interceptorResult = await this._interceptorEngine.execute(
              execInput,
              async (interceptorInput, interceptorCtx) => {
                if (!serviceExecuted) {
                  serviceExecuted = true;
                  this._diagnostics.recordServiceExecuted();
                }
                return service.execute(interceptorInput as TInput, interceptorCtx);
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
        this._diagnostics.recordExecutionCompleted(durationMs);

        return ApplicationResultFactory.createCompleted<TResult>(
          type,
          context.executionId,
          execResult.value as TResult,
          durationMs,
        );
      } catch (err: unknown) {
        const durationMs = Math.round(profiler.elapsedMs * 100) / 100;

        if (
          context.signal.aborted ||
          err instanceof ApplicationCancellationError ||
          err instanceof ExecutionCancellationError
        ) {
          context.cancel();
          this._diagnostics.recordExecutionCancelled(durationMs);
          return ApplicationResultFactory.createCancelled<TResult>(
            type,
            context.executionId,
            err,
            durationMs,
          );
        }

        context.fail();
        this._diagnostics.recordServiceFailed();
        this._diagnostics.recordExecutionFailed(durationMs);
        return ApplicationResultFactory.createFailed<TResult>(
          type,
          context.executionId,
          err,
          durationMs,
        );
      }
    });
  }
}
