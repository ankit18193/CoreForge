import { Interceptor, InterceptorContext } from '@coreforge/contracts';

import { InterceptionResult } from './InterceptionResult';
import { InvocationChain } from './InvocationChain';

export class InterceptorChain {
  public build(
    context: InterceptorContext,
    interceptors: readonly Interceptor[],
    coreAction: () => Promise<InterceptionResult>,
    onInterceptorExecute?: (name: string, phase: 'before' | 'after', durationMs: number) => void,
  ): () => Promise<InterceptionResult> {
    let nextProceed = coreAction;

    for (let i = interceptors.length - 1; i >= 0; i--) {
      const interceptor = interceptors[i];
      const currentProceed = nextProceed;

      nextProceed = async () => {
        const chain = new InvocationChain(context, currentProceed);

        const name = interceptor.constructor.name;
        const start = Date.now();
        onInterceptorExecute?.(name, 'before', 0);

        const res = await interceptor.intercept(context, chain);

        const duration = Date.now() - start;
        onInterceptorExecute?.(name, 'after', duration);

        return res;
      };
    }

    return nextProceed;
  }
}
