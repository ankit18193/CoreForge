import { InterceptorExecutionError } from '../errors/ExecutionErrors';
import { ExecutionContext, Interceptor } from '../types/executionTypes';

export class InterceptorExecutor {
  public static async execute(
    context: ExecutionContext,
    target: () => Promise<unknown>,
  ): Promise<unknown> {
    const { action } = context;
    const tokens = action.interceptors || [];

    if (tokens.length === 0) {
      return target();
    }

    const interceptors: Interceptor[] = [];
    for (const token of tokens) {
      let inst: Interceptor;
      try {
        inst = (await context.resolve(token)) as Interceptor;
      } catch (err) {
        throw new InterceptorExecutionError(
          `Failed to resolve interceptor for action "${action.id}".`,
          { actionId: action.id, interceptorToken: token, cause: err },
        );
      }

      if (!inst || typeof inst.intercept !== 'function') {
        throw new InterceptorExecutionError(
          `Resolved interceptor for token "${String(token)}" does not implement intercept().`,
          { actionId: action.id, interceptorToken: token },
        );
      }
      interceptors.push(inst);
    }

    let currentIndex = 0;
    const next = async (): Promise<unknown> => {
      if (currentIndex < interceptors.length) {
        const current = interceptors[currentIndex++];
        return current.intercept(context, next);
      }
      return target();
    };

    return next();
  }
}
