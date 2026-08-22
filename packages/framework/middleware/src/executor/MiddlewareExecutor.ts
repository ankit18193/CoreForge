import { Next } from '@coreforge/contracts';

import { PipelineTarget } from './PipelineTarget';
import { MiddlewareExecutionError } from '../errors/MiddlewareErrors';
import { MiddlewareProfiler } from '../internal/MiddlewareProfiler';
import { MiddlewareExecutionContext } from '../pipeline/MiddlewareExecutionContext';
import { MiddlewareDescriptor } from '../registry/MiddlewareDescriptor';

export class MiddlewareExecutor {
  private readonly _profiler: MiddlewareProfiler;

  constructor(profiler: MiddlewareProfiler) {
    this._profiler = profiler;
  }

  public async execute(
    descriptors: readonly MiddlewareDescriptor[],
    context: MiddlewareExecutionContext,
    target: PipelineTarget,
  ): Promise<{ completed: boolean }> {
    let index = -1;
    let completed = false;
    this._profiler.recordPipelineRun(descriptors.length);

    const dispatch = async (i: number): Promise<void> => {
      if (i <= index) {
        throw new MiddlewareExecutionError('next() called multiple times in middleware pipeline.');
      }
      index = i;

      let fn: MiddlewareDescriptor | undefined;
      if (i < descriptors.length) {
        fn = descriptors[i];
      }

      if (!fn) {
        await target.execute(context);
        completed = true;
        return;
      }

      let nextCalled = false;
      const next: Next = async () => {
        nextCalled = true;
        await dispatch(i + 1);
      };

      const start = Date.now();
      try {
        await fn.middleware.execute(context, next);

        const duration = Date.now() - start;
        this._profiler.recordExecution(fn.id, duration);
      } catch (err: unknown) {
        this._profiler.recordException();
        throw err;
      }

      if (!nextCalled && i < descriptors.length) {
        this._profiler.recordTermination();

        const skipped = descriptors.length - (i + 1);
        if (skipped > 0) {
          this._profiler.recordSkip(skipped);
        }
      }
    };

    await dispatch(0);
    return { completed };
  }
}
