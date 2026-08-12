import { MiddlewareExecutionContext, MiddlewarePipeline } from '@coreforge/middleware';

import { PipelineStage } from '../pipeline/PipelineStage';
import { RequestExecutionContext } from '../pipeline/RequestExecutionContext';
import { RequestStage } from '../pipeline/RequestStage';

export class MiddlewareCoordinator implements PipelineStage {
  public readonly stage = RequestStage.MIDDLEWARE;
  private readonly _middlewarePipeline: MiddlewarePipeline;

  constructor(middlewarePipeline: MiddlewarePipeline) {
    this._middlewarePipeline = middlewarePipeline;
  }

  public async execute(context: RequestExecutionContext): Promise<void> {
    context.cancellation.throwIfCancelled();

    let targetExecuted = false;
    const target = {
      async execute(): Promise<void> {
        targetExecuted = true;
      },
    };

    const options: { routePath?: string } = {};
    if (context.route?.path !== undefined) {
      options.routePath = context.route.path;
    }

    const result = await this._middlewarePipeline.execute(
      context as unknown as MiddlewareExecutionContext,
      target,
      options,
    );

    if (result.exceptionThrown) {
      return;
    }

    if (!targetExecuted || result.terminatedEarly) {
      context.diagnostics.middlewareTerminatedEarly = true;
    }
  }
}
