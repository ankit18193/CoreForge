import { ParameterBindingResolver } from '@coreforge/parameter-binding';

import { ActionInvoker } from '../action/ActionInvoker';
import { GuardExecutor } from '../guard/GuardExecutor';
import { InterceptorExecutor } from '../interceptor/InterceptorExecutor';
import { MiddlewareExecutor } from '../middleware/MiddlewareExecutor';
import { ExecutionContext } from '../types/executionTypes';

export class ExecutionPipeline {
  private readonly _invoker: ActionInvoker;
  private readonly _paramResolver: ParameterBindingResolver;

  constructor(
    invoker: ActionInvoker = new ActionInvoker(),
    paramResolver: ParameterBindingResolver = new ParameterBindingResolver(),
  ) {
    this._invoker = invoker;
    this._paramResolver = paramResolver;
  }

  public async execute(context: ExecutionContext): Promise<unknown> {
    // 1. Guards execute upfront. If rejected, throws GuardRejectedError.
    await GuardExecutor.execute(context);

    // 2. Middleware Chain wraps Interceptor Chain
    return MiddlewareExecutor.execute(context, async () => {
      // 3. Interceptor Chain wraps Parameter Binding & Action Invocation
      return InterceptorExecutor.execute(context, async () => {
        // 4. Parameter Binding
        const boundArgs = this._paramResolver.resolveArguments(
          context.action.parameterBindings,
          context.request,
        );

        // 5. Controller Invocation
        return this._invoker.invoke(context, boundArgs);
      });
    });
  }
}
