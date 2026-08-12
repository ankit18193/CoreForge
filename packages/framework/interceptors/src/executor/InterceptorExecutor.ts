import { Interceptor, InterceptorContext } from '@coreforge/contracts';

import { InterceptionResult } from './InterceptionResult';
import { InterceptorChain } from './InterceptorChain';

export class InterceptorExecutor {
  private readonly _chainBuilder = new InterceptorChain();

  public async execute(
    context: InterceptorContext,
    interceptors: readonly Interceptor[],
    coreAction: () => Promise<InterceptionResult>,
    onInterceptorExecute?: (name: string, phase: 'before' | 'after', durationMs: number) => void,
  ): Promise<InterceptionResult> {
    const chain = this._chainBuilder.build(context, interceptors, coreAction, onInterceptorExecute);
    return chain();
  }
}
