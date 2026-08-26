import { ActionExecutionContext } from './ActionExecutionContext';
import {
  ActionDescriptor,
  ActionMiddleware,
  Guard,
  IActionExecutionEngine,
  InjectionToken,
  Interceptor,
  ParameterBindingDescriptor,
  RequestContext,
} from './ActionExecutionTypes';
import { GuardRejectedError } from '../errors/ExecutionErrors';

function extractParameter(binding: ParameterBindingDescriptor, rawRequest: unknown): unknown {
  const req = (rawRequest || {}) as {
    params?: Record<string, unknown>;
    query?: Record<string, unknown>;
    body?: unknown;
    headers?: Record<string, unknown>;
    cookies?: Record<string, unknown>;
  };

  let value: unknown;
  switch (binding.source) {
    case 'PARAM':
      value = binding.name ? req.params?.[binding.name] : req.params;
      break;
    case 'QUERY':
      value = binding.name ? req.query?.[binding.name] : req.query;
      break;
    case 'BODY':
      value =
        binding.name && typeof req.body === 'object' && req.body !== null
          ? (req.body as Record<string, unknown>)[binding.name]
          : req.body;
      break;
    case 'HEADER':
      value = binding.name ? req.headers?.[binding.name.toLowerCase()] : req.headers;
      break;
    case 'COOKIE':
      value = binding.name ? req.cookies?.[binding.name] : req.cookies;
      break;
    default:
      value = undefined;
  }

  const defVal = (binding as { defaultValue?: unknown }).defaultValue;
  if (value === undefined && defVal !== undefined) {
    value = defVal;
  }

  return value;
}

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
        const guard = await execContext.resolve<Guard>(guardToken as InjectionToken<Guard>);
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
        args[binding.parameterIndex] = extractParameter(binding, request);
      }
    }

    // 3. Obtain Controller Instance
    const controller = await execContext.resolve<
      Record<string | symbol, (...parameters: unknown[]) => unknown>
    >(
      action.controllerToken as InjectionToken<
        Record<string | symbol, (...parameters: unknown[]) => unknown>
      >,
    );

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
          const interceptor = await execContext.resolve<Interceptor>(
            token as InjectionToken<Interceptor>,
          );
          return interceptor.intercept(execContext, nextRunner);
        };
      }
    }

    // Compose middleware (outer)
    if (action.middleware && action.middleware.length > 0) {
      const middlewareTokens = [...action.middleware].reverse();
      for (const token of middlewareTokens) {
        const nextRunner = runner;
        runner = async () => {
          const mw = await execContext.resolve<ActionMiddleware>(
            token as InjectionToken<ActionMiddleware>,
          );
          return mw.handle(execContext, nextRunner);
        };
      }
    }

    return runner();
  }
}
