import { RouteMethod, Router } from '@coreforge/contracts';

import { PipelineStage } from '../pipeline/PipelineStage';
import { RequestExecutionContext } from '../pipeline/RequestExecutionContext';
import { RequestStage } from '../pipeline/RequestStage';

export class RoutingCoordinator implements PipelineStage {
  public readonly stage = RequestStage.ROUTING;
  private readonly _router: Router;

  constructor(router: Router) {
    this._router = router;
  }

  public async execute(context: RequestExecutionContext): Promise<void> {
    context.cancellation.throwIfCancelled();

    const match = this._router.resolve(
      context.request.method as RouteMethod,
      context.request.path,
    );
    if (match) {
      context.route = match.route;
      context.parameters = Object.freeze({ ...match.parameters });
    }
  }
}
