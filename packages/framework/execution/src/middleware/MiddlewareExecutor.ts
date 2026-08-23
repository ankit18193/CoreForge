import { MiddlewareExecutionError } from '../errors/ExecutionErrors';
import { ExecutionContext, Middleware } from '../types/executionTypes';

export class MiddlewareExecutor {
  public static async execute(
    context: ExecutionContext,
    target: () => Promise<unknown>,
  ): Promise<unknown> {
    const { action } = context;
    const tokens = action.middleware || [];

    if (tokens.length === 0) {
      return target();
    }

    const middlewares: Middleware[] = [];
    for (const token of tokens) {
      let inst: Middleware;
      try {
        inst = (await context.resolve(token)) as Middleware;
      } catch (err) {
        throw new MiddlewareExecutionError(
          `Failed to resolve middleware for action "${action.id}".`,
          { actionId: action.id, middlewareToken: token, cause: err },
        );
      }

      if (!inst || typeof inst.handle !== 'function') {
        throw new MiddlewareExecutionError(
          `Resolved middleware for token "${String(token)}" does not implement handle().`,
          { actionId: action.id, middlewareToken: token },
        );
      }
      middlewares.push(inst);
    }

    let currentIndex = 0;
    const next = async (): Promise<unknown> => {
      if (currentIndex < middlewares.length) {
        const current = middlewares[currentIndex++];
        return current.handle(context, next);
      }
      return target();
    };

    return next();
  }
}
