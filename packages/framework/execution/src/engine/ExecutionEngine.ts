import { ExecutionContext } from './ExecutionContext';
import { ActionInvoker } from '../action/ActionInvoker';
import { ExecutionDiagnostics } from '../diagnostics/ExecutionDiagnostics';
import {
  ActionInvocationError,
  ActionNotFoundError,
  ControllerResolutionError,
  GuardRejectedError,
  InterceptorExecutionError,
  MiddlewareExecutionError,
} from '../errors/ExecutionErrors';
import { ExecutionProfiler } from '../internal/ExecutionProfiler';
import { ExecutionLifecycleManager } from '../lifecycle/ExecutionLifecycleManager';
import { ExecutionState } from '../lifecycle/ExecutionState';
import { ExecutionPipeline } from '../pipeline/ExecutionPipeline';
import {
  ActionDescriptor,
  ExecutionDiagnosticsSnapshot,
  ExecutionEngine as IExecutionEngine,
  RequestContext,
} from '../types/executionTypes';

export class ExecutionEngine implements IExecutionEngine {
  private readonly _pipeline: ExecutionPipeline;
  private readonly _lifecycle = new ExecutionLifecycleManager();
  private readonly _diagnostics = new ExecutionDiagnostics();
  private readonly _enableDiagnostics: boolean;

  constructor(
    options: {
      invoker?: ActionInvoker;
      pipeline?: ExecutionPipeline;
      enableDiagnostics?: boolean;
    } = {},
  ) {
    this._enableDiagnostics = options.enableDiagnostics ?? true;
    this._pipeline = options.pipeline || new ExecutionPipeline(options.invoker);
    this._lifecycle.transitionTo(ExecutionState.READY);
  }

  public get state(): ExecutionState {
    return this._lifecycle.state;
  }

  public get diagnostics(): ExecutionDiagnosticsSnapshot {
    return this._diagnostics.snapshot();
  }

  public start(): void {
    this._lifecycle.transitionTo(ExecutionState.RUNNING);
  }

  public stop(): void {
    if (this._lifecycle.state !== ExecutionState.STOPPED) {
      this._lifecycle.transitionTo(ExecutionState.STOPPING);
      this._lifecycle.transitionTo(ExecutionState.STOPPED);
    }
  }

  public async execute(
    action: ActionDescriptor,
    request: unknown,
    context: RequestContext,
  ): Promise<unknown> {
    this._lifecycle.assertCanExecute();

    const profiler = new ExecutionProfiler();
    profiler.start();

    const execContext = new ExecutionContext(context, action, request);

    try {
      const result = await this._pipeline.execute(execContext);
      const duration = profiler.stop();
      if (this._enableDiagnostics) {
        this._diagnostics.recordSuccess(duration);
      }
      return result;
    } catch (err) {
      const duration = profiler.stop();
      if (this._enableDiagnostics) {
        this._diagnostics.recordFailure(duration, {
          isGuardRejection: err instanceof GuardRejectedError,
          isMiddlewareFailure: err instanceof MiddlewareExecutionError,
          isInterceptorFailure: err instanceof InterceptorExecutionError,
          isActionFailure:
            err instanceof ActionInvocationError ||
            err instanceof ActionNotFoundError ||
            err instanceof ControllerResolutionError,
        });
      }
      throw err;
    }
  }
}
