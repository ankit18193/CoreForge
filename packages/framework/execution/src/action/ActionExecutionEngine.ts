import {
  ActionDescriptor,
  IActionExecutionEngine,
  RequestContext,
} from './ActionExecutionTypes';
import { ActionExecutionContext } from './ActionExecutionContext';
import { Guard, Interceptor, ActionMiddleware } from './ActionExecutionTypes';
import {
  GuardRejectedError,
  InterceptorExecutionError,
  MiddlewareExecutionError,
} from '../errors/ExecutionErrors';

export class ActionExecutionEngine implements IActionExecutionEngine {
  public async execute(
    action: ActionDescriptor,
    request: unknown,
    context: RequestContext,
  ): Promise<unknown> {
    const execContext = new ActionExecutionContext(context, action, request);

    // 1. Execute Guards
    if (action.guards && action.guards.length > 0) {
      for (const guardToken of action.guards) {
        const guard = await execContext.resolve<Guard>(guardToken as any);
        const canActivate = await guard.canActivate(execContext);
        if (!canActivate) {
          throw new GuardRejectedError('Guard rejected request', { guardToken });
        }
      }
    }

    // 2. Resolve Parameters
    const args: unknown[] = [];
    if (action.parameterBindings && action.parameterBindings.length > 0) {
      for (const binding of action.parameterBindings) {
        if ('resolve' in binding && typeof (binding as any).resolve === 'function') {
          args[binding.parameterIndex] = await (binding as any).resolve(context, request);
        } else {
          args[binding.parameterIndex] = undefined;
        }
      }
    }

    // 3. Obtain Controller Instance
    const controller = await execContext.resolve<any>(action.controllerToken as any);

    // 4. Build Middleware & Interceptor Pipeline
    const executeAction = async (): Promise<unknown> => {
      const method = controller[action.methodName];
      if (typeof method !== 'function') {
        throw new Error(`Controller method ${String(action.methodName)} is not a function`);
      }
      return method.apply(controller, args);
    };

    // Compose interceptors (inner)
    let runner = executeAction;
    if (action.interceptors && action.interceptors.length > 0) {
      const interceptorTokens = [...action.interceptors].reverse();
      for (const token of interceptorTokens) {
        const nextRunner = runner;
        runner = async () => {
          try {
            const interceptor = await execContext.resolve<Interceptor>(token as any);
            return await interceptor.intercept(execContext, nextRunner);
          } catch (err: unknown) {
            if (err instanceof GuardRejectedError) {
              throw err;
            }
            throw new InterceptorExecutionError(
              (err as Error)?.message || 'Interceptor execution failed',
              err,
            );
          }
        };
      }
    }

    // Compose middleware (outer)
    if (action.middleware && action.middleware.length > 0) {
      const middlewareTokens = [...action.middleware].reverse();
      for (const token of middlewareTokens) {
        const nextRunner = runner;
        runner = async () => {
          try {
            const mw = await execContext.resolve<ActionMiddleware>(token as any);
            return await mw.handle(execContext, nextRunner);
          } catch (err: unknown) {
            if (err instanceof GuardRejectedError || err instanceof InterceptorExecutionError) {
              throw err;
            }
            throw new MiddlewareExecutionError(
              (err as Error)?.message || 'Middleware execution failed',
              err,
            );
          }
        };
      }
    }

    return runner();
  }
}
