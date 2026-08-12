import { PipelineStage } from './PipelineStage';
import { RequestExecutionContext } from './RequestExecutionContext';
import { RequestState } from './RequestState';
import { RequestProfiler } from '../internal/RequestProfiler';
import { RequestLifecycleManager } from '../lifecycle/RequestLifecycleManager';

export class RequestPipeline {
  private readonly _stages: PipelineStage[];
  private readonly _profiler: RequestProfiler;

  constructor(stages: PipelineStage[], profiler: RequestProfiler) {
    this._stages = stages;
    this._profiler = profiler;
    Object.freeze(this);
  }

  public async execute(
    context: RequestExecutionContext,
    lifecycle: RequestLifecycleManager,
  ): Promise<void> {
    for (const stage of this._stages) {
      context.cancellation.throwIfCancelled();

      const targetState = this.mapStageToState(stage.stage);
      lifecycle.transitionTo(targetState);

      const start = Date.now();
      let exceptionThrown = false;
      try {
        await stage.execute(context);
      } catch (err: unknown) {
        exceptionThrown = true;
        lifecycle.transitionTo(RequestState.FAILED);
        this._profiler.failRequest();
        throw err;
      } finally {
        const duration = Date.now() - start;
        this._profiler.recordStage(stage.stage, duration, exceptionThrown);
      }
    }
  }

  private mapStageToState(stage: string): RequestState {
    const map: Record<string, RequestState> = {
      ROUTING: RequestState.ROUTING,
      MIDDLEWARE: RequestState.MIDDLEWARE,
      CONTROLLER: RequestState.CONTROLLER,
      RESPONDING: RequestState.RESPONDING,
    };
    return map[stage] || RequestState.FAILED;
  }
}
