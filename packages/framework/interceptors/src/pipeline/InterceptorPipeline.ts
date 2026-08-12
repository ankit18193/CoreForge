import { Interceptor, InterceptorContext } from '@coreforge/contracts';

import { InterceptorExecutionContext } from './InterceptorExecutionContext';
import { InterceptorStage } from './InterceptorStage';
import { InterceptionResult } from '../executor/InterceptionResult';
import { InterceptorExecutor } from '../executor/InterceptorExecutor';
import { InterceptorProfiler } from '../internal/InterceptorProfiler';

export class InterceptorPipeline {
  private readonly _executor = new InterceptorExecutor();

  public async execute(
    context: InterceptorContext,
    interceptors: readonly Interceptor[],
    coreAction: () => Promise<InterceptionResult>,
    onInterceptorExecute?: (name: string, phase: 'before' | 'after', durationMs: number) => void,
    profiler?: InterceptorProfiler,
  ): Promise<InterceptionResult> {
    const execContext = new InterceptorExecutionContext(context);

    try {
      execContext.setStage(InterceptorStage.BEFORE);

      const res = await this._executor.execute(
        context,
        interceptors,
        async () => {
          execContext.setStage(InterceptorStage.INVOCATION);

          const start = Date.now();
          const coreRes = await coreAction();
          profiler?.recordInvocation(Date.now() - start);

          return coreRes;
        },
        (name, phase, durationMs) => {
          if (phase === 'before') {
            execContext.setStage(InterceptorStage.BEFORE);
          } else {
            execContext.setStage(InterceptorStage.AFTER);
          }
          onInterceptorExecute?.(name, phase, durationMs);
        },
      );

      execContext.setStage(InterceptorStage.COMPLETED);
      return res;
    } catch (err: unknown) {
      execContext.setStage(InterceptorStage.FAILED);
      throw err;
    }
  }
}
