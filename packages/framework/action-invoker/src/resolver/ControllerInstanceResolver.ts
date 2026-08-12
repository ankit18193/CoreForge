import { Controller, RequestScope } from '@coreforge/contracts';

import { ControllerResolutionError } from '../errors/ActionInvokerErrors';

export class ControllerInstanceResolver {
  public resolve(controller: Controller, scope: RequestScope): Controller {
    try {
      const token = controller.constructor;
      const instance = scope.resolve<Controller>(token);
      if (!instance) {
        throw new ControllerResolutionError(`Controller instance resolved as null/undefined.`);
      }
      return instance;
    } catch (err: unknown) {
      throw new ControllerResolutionError(
        `Failed to resolve request-scoped controller instance from request scope.`,
        err instanceof Error ? err : new Error(String(err)),
      );
    }
  }
}
