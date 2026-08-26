import { ExecutionContext } from '@coreforge/contracts';

import { ExecutionCancellationError, ExecutionMiddlewareError } from '../errors/ExecutionErrors';
import { ExecutionMiddleware } from '../types/executionTypes';

export interface ChainHooks {
  onMiddlewareExecuted(): void;
  onMiddlewareFailed(): void;
}

export class MiddlewareChain {
  public static async run<TInput, TResult>(
    input: TInput,
    context: ExecutionContext,
    middlewares: readonly ExecutionMiddleware<unknown, unknown>[],
    terminalHandler: () => Promise<TResult>,
    hooks: ChainHooks,
  ): Promise<{ result: TResult; handlerExecuted: boolean }> {
    let index = -1;
    let handlerExecuted = false;

    const dispatch = async (i: number): Promise<TResult> => {
      if (i <= index) {
        throw new ExecutionMiddlewareError('next() called multiple times in middleware chain');
      }
      index = i;

      if (context.signal.aborted) {
        throw new ExecutionCancellationError('Execution was cancelled');
      }

      if (i === middlewares.length) {
        handlerExecuted = true;
        return terminalHandler();
      }

      const middleware = middlewares[i];
      try {
        const res = await middleware.execute(
          input,
          context,
          () => dispatch(i + 1) as Promise<unknown>,
        );
        hooks.onMiddlewareExecuted();
        return res as TResult;
      } catch (err: unknown) {
        hooks.onMiddlewareFailed();
        throw err;
      }
    };

    const result = await dispatch(0);
    return { result, handlerExecuted };
  }
}
