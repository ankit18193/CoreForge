import { Controller } from '@coreforge/contracts';
import { ActionDescriptor, ControllerRegistry } from '@coreforge/controllers';

import { ActionNotFoundError } from '../errors/ActionInvokerErrors';

export class ActionDescriptorResolver {
  private readonly _controllerRegistry: ControllerRegistry;
  private readonly _cache = new Map<string, ActionDescriptor>();

  constructor(controllerRegistry: ControllerRegistry) {
    this._controllerRegistry = controllerRegistry;
  }

  public resolve(controller: Controller, actionName: string): ActionDescriptor {
    const controllerName = controller.constructor.name;
    const cacheKey = `${controllerName}:${actionName}`;

    if (this._cache.has(cacheKey)) {
      return this._cache.get(cacheKey)!;
    }

    const controllerDesc = this._controllerRegistry.getByName(controllerName);
    if (!controllerDesc) {
      throw new ActionNotFoundError(
        `ActionDescriptorResolver: Controller descriptor not found for name "${controllerName}".`,
      );
    }

    const actionDesc = controllerDesc.actions.find(
      (a: ActionDescriptor) => a.metadata.actionName === actionName,
    );

    if (!actionDesc) {
      throw new ActionNotFoundError(
        `ActionDescriptorResolver: Action "${actionName}" not found on controller "${controllerName}".`,
      );
    }

    this._cache.set(cacheKey, actionDesc);
    return actionDesc;
  }
}
