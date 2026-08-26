import type { ExecutionContext } from '@coreforge/contracts';

import { ContinuationGuard } from './ContinuationGuard';
import { InterceptorExecutionError } from '../errors/InterceptorErrors';
import { Interceptor } from '../types/interceptorTypes';

export interface InterceptorChainHooks {
  onInterceptorExecuted(): void;
  onInterceptorFailed(): void;
}

export class InterceptorChain {
  public static async run<TInput, TResult>(
    input: TInput,
    context: ExecutionContext,
    interceptors: readonly Interceptor<unknown, unknown>[],
    terminalHandler: (input: TInput, context: ExecutionContext) => Promise<TResult> | TResult,
    hooks: InterceptorChainHooks,
  ): Promise<{ result: TResult; handlerExecuted: boolean }> {
    let handlerExecuted = false;

    const executeStep = async (index: number): Promise<TResult> => {
      if (context.signal.aborted) {
        throw new InterceptorExecutionError(
          'Execution was cancelled during interceptor chain processing',
          'CF-INTERCEPTOR-EXECUTION',
        );
      }

      if (index === interceptors.length) {
        handlerExecuted = true;
        return terminalHandler(input, context);
      }

      const interceptor = interceptors[index];
      const guard = new ContinuationGuard();

      const next = async (): Promise<TResult> => {
        guard.assertCanProceed();
        return executeStep(index + 1);
      };

      try {
        const res = await interceptor.intercept(input, context, next as () => Promise<unknown>);
        hooks.onInterceptorExecuted();
        return res as TResult;
      } catch (err: unknown) {
        hooks.onInterceptorFailed();
        throw err;
      }
    };

    const result = await executeStep(0);
    return { result, handlerExecuted };
  }
}
