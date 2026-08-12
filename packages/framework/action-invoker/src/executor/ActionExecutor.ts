import { ActionArguments, Controller } from '@coreforge/contracts';
import { ActionDescriptor } from '@coreforge/controllers';

import { ActionInvocationExecutionError } from '../errors/ActionInvokerErrors';

export class ActionExecutor {
  public async execute(
    instance: Controller,
    actionDesc: ActionDescriptor,
    args: ActionArguments,
  ): Promise<{ value: unknown; durationMs: number }> {
    const start = Date.now();
    const actionName = actionDesc.metadata.actionName;

    const method = (instance as Record<string, unknown>)[actionName];
    if (typeof method !== 'function') {
      throw new ActionInvocationExecutionError(
        `ActionExecutor: target method "${actionName}" is not a function on controller instance.`,
      );
    }

    try {
      const result = await Promise.resolve(method.apply(instance, [...args.positionals]));
      const durationMs = Date.now() - start;
      return { value: result, durationMs };
    } catch (err: unknown) {
      throw new ActionInvocationExecutionError(
        `ActionExecutor: target action execution failed on method "${actionName}".`,
        err instanceof Error ? err : new Error(String(err)),
      );
    }
  }
}
