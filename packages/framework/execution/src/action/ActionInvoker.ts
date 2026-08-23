import {
  ActionInvocationError,
  ActionNotFoundError,
  ControllerResolutionError,
} from '../errors/ExecutionErrors';
import { ActionInvoker as IActionInvoker, ExecutionContext } from '../types/executionTypes';

export class ActionInvoker implements IActionInvoker {
  public async invoke(context: ExecutionContext, arguments_: readonly unknown[]): Promise<unknown> {
    const { action } = context;

    let controller: unknown;
    try {
      controller = await context.resolve(action.controllerToken);
    } catch (err) {
      throw new ControllerResolutionError(
        `Failed to resolve controller for action "${action.id}".`,
        { actionId: action.id, controllerToken: action.controllerToken, cause: err },
      );
    }

    if (typeof controller !== 'object' || controller === null) {
      throw new ControllerResolutionError(
        `Resolved controller for action "${action.id}" is not an object.`,
        { actionId: action.id, controller },
      );
    }

    const controllerRecord = controller as Record<string | symbol, unknown>;
    const method = controllerRecord[action.methodName];

    if (typeof method !== 'function') {
      throw new ActionNotFoundError(
        `Action method "${String(action.methodName)}" not found or not callable on controller for action "${action.id}".`,
        { actionId: action.id, methodName: String(action.methodName) },
      );
    }

    try {
      const callable = method as (...args: readonly unknown[]) => unknown;
      const result = callable.call(controller, ...arguments_);
      return await Promise.resolve(result);
    } catch (err) {
      if (err instanceof Error) {
        throw err;
      }
      throw new ActionInvocationError(`Action "${action.id}" threw a non-Error exception.`, {
        actionId: action.id,
        cause: err,
      });
    }
  }
}
