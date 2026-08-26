import type { ExecutionContext, InterceptorResult } from '@coreforge/contracts';
import { ExecutionContextManager } from '@coreforge/execution-context';

import { InterceptorChain } from '../chain/InterceptorChain';
import { InterceptorDiagnostics } from '../diagnostics/InterceptorDiagnostics';
import { InterceptorError, InterceptorExecutionError } from '../errors/InterceptorErrors';
import { InterceptorProfiler } from '../internal/InterceptorProfiler';
import { InterceptorLifecycleManager } from '../lifecycle/InterceptorLifecycleManager';
import { InterceptorRegistry } from '../registry/InterceptorRegistry';

function deepFreeze<T>(obj: T, seen = new WeakSet<object>()): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (seen.has(obj as object)) {
    return obj;
  }
  seen.add(obj as object);

  if (Array.isArray(obj)) {
    for (const item of obj) {
      deepFreeze(item, seen);
    }
    return Object.freeze(obj) as T;
  }

  const propNames = Reflect.ownKeys(obj as object);
  for (const name of propNames) {
    const value = (obj as Record<string | symbol, unknown>)[name];
    if (value && typeof value === 'object') {
      deepFreeze(value, seen);
    }
  }

  return Object.freeze(obj) as T;
}

export class InterceptorExecutor {
  private readonly _contextManager: ExecutionContextManager;
  private readonly _lifecycle: InterceptorLifecycleManager;
  private readonly _registry: InterceptorRegistry;
  private readonly _diagnostics: InterceptorDiagnostics;

  constructor(
    contextManager: ExecutionContextManager,
    lifecycle: InterceptorLifecycleManager,
    registry: InterceptorRegistry,
    diagnostics: InterceptorDiagnostics,
  ) {
    this._contextManager = contextManager;
    this._lifecycle = lifecycle;
    this._registry = registry;
    this._diagnostics = diagnostics;
  }

  public async execute<TInput, TResult>(
    input: TInput,
    handler: (input: TInput, context: ExecutionContext) => Promise<TResult> | TResult,
    options?: { readonly context?: ExecutionContext | undefined },
  ): Promise<InterceptorResult<TResult>> {
    this._lifecycle.ensureReadyForExecution();

    if (typeof handler !== 'function') {
      throw new InterceptorError('Handler must be a function', 'CF-INTERCEPTOR-ERROR', { handler });
    }

    const context = options?.context ?? this._contextManager.create({ autoStart: true });
    if (context.state === 'CREATED') {
      context.start();
    }

    const interceptors = this._registry.getSnapshot();
    const profiler = new InterceptorProfiler().start();

    this._diagnostics.recordExecutionStarted();

    return this._contextManager.run(context, async () => {
      try {
        if (context.signal.aborted) {
          throw new InterceptorExecutionError(
            'Execution was cancelled before interceptor execution',
            'CF-INTERCEPTOR-EXECUTION',
          );
        }

        const { result, handlerExecuted } = await InterceptorChain.run(
          input,
          context,
          interceptors,
          handler,
          {
            onInterceptorExecuted: () => this._diagnostics.recordInterceptorExecuted(),
            onInterceptorFailed: () => this._diagnostics.recordInterceptorFailed(),
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

        const frozenValue =
          result !== null && typeof result === 'object' ? deepFreeze(result) : result;

        return Object.freeze({
          value: frozenValue,
          intercepted: !handlerExecuted,
          executionId: context.executionId,
          durationMs,
        });
      } catch (err: unknown) {
        context.fail();
        const durationMs = Math.round(profiler.elapsedMs * 100) / 100;
        this._diagnostics.recordExecutionFailed(durationMs);
        throw err;
      }
    });
  }
}
