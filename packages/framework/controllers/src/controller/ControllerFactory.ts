import { Container, Controller } from '@coreforge/contracts';

import { ControllerStateError } from '../errors/ControllerErrors';

export class ControllerFactory {
  private readonly _container?: Container | undefined;

  constructor(container?: Container) {
    this._container = container;
  }

  public create(constructor: new (...args: never[]) => Controller): Controller {
    if (!constructor || typeof constructor !== 'function') {
      throw new ControllerStateError('Invalid controller constructor class definition.');
    }

    if (this._container && this._container.has(constructor)) {
      return this._container.resolve<Controller>(constructor);
    }

    try {
      if (constructor.length > 0 && !this._container) {
        throw new ControllerStateError(
          `Cannot instantiate controller "${constructor.name}" due to missing constructor arguments. Register it in a DI Container or provide a parameterless constructor.`,
        );
      }
      return new constructor();
    } catch (err: unknown) {
      if (err instanceof ControllerStateError) {
        throw err;
      }
      throw new ControllerStateError(
        `Failed to instantiate controller "${constructor.name}".`,
        err,
      );
    }
  }
}
