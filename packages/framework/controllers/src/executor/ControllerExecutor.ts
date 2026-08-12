import { ActionContext } from '@coreforge/contracts';

import { ActionExecutor } from './ActionExecutor';
import { ExecutionResult } from './ExecutionResult';
import { ActionNotFoundError } from '../errors/ControllerErrors';
import { ActionProfiler } from '../internal/ActionProfiler';
import { ControllerDescriptor } from '../registry/ControllerDescriptor';

export class ControllerExecutor {
  private readonly _actionExecutor = new ActionExecutor();
  private readonly _profiler: ActionProfiler;

  constructor(profiler: ActionProfiler) {
    this._profiler = profiler;
  }

  public async execute(
    descriptor: ControllerDescriptor,
    actionName: string,
    _context: ActionContext,
    args: unknown[] = [],
  ): Promise<ExecutionResult> {
    const actionDesc = descriptor.actions.find((a) => a.metadata.actionName === actionName);
    if (!actionDesc) {
      throw new ActionNotFoundError(
        `Action "${actionName}" was not found on controller "${descriptor.metadata.name}".`,
      );
    }

    const start = Date.now();
    try {
      const value = await this._actionExecutor.execute(actionDesc, descriptor.instance, args);
      const duration = Date.now() - start;
      this._profiler.recordExecution(descriptor.id, actionName, duration, true);

      const result: ExecutionResult = {
        success: true,
        returnedValue: value,
        duration,
        exception: null,
      };
      return Object.freeze(result);
    } catch (err: unknown) {
      const duration = Date.now() - start;
      this._profiler.recordExecution(descriptor.id, actionName, duration, false);

      const result: ExecutionResult = {
        success: false,
        returnedValue: null,
        duration,
        exception: err,
      };
      return Object.freeze(result);
    }
  }
}
