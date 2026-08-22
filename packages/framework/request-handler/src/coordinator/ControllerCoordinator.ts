import { ControllerManager } from '@coreforge/controllers';

import { PipelineStage } from '../pipeline/PipelineStage';
import { RequestExecutionContext } from '../pipeline/RequestExecutionContext';
import { RequestStage } from '../pipeline/RequestStage';

export class ControllerCoordinator implements PipelineStage {
  public readonly stage = RequestStage.CONTROLLER;
  private readonly _controllerManager: ControllerManager;

  constructor(controllerManager: ControllerManager) {
    this._controllerManager = controllerManager;
  }

  public async execute(context: RequestExecutionContext): Promise<void> {
    context.cancellation.throwIfCancelled();

    if (context.diagnostics.middlewareTerminatedEarly) {
      return;
    }

    const mapping = context.diagnostics.routeMapping as
      { controllerId: string; actionName: string } | undefined;
    if (!mapping) {
      return;
    }

    const desc = this._controllerManager.registry.get(mapping.controllerId);
    if (!desc) {
      return;
    }

    context.controllerDescriptor = desc;
    const actionDesc = desc.actions.find((a) => a.metadata.actionName === mapping.actionName);
    if (actionDesc) {
      context.actionDescriptor = actionDesc;
    }

    const start = Date.now();
    try {
      const result = await this._controllerManager.execute(
        desc.instance,
        mapping.actionName,
        context,
        [context.parameters],
      );

      context.diagnostics.controllerResult = {
        success: true,
        returnedValue: result,
        duration: Date.now() - start,
        exception: null,
      };
    } catch (err: unknown) {
      context.diagnostics.controllerResult = {
        success: false,
        returnedValue: null,
        duration: Date.now() - start,
        exception: err,
      };
      throw err;
    }
  }
}
