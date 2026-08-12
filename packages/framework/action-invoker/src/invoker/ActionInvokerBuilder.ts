import { Logger } from '@coreforge/contracts';
import { ControllerRegistry } from '@coreforge/controllers';

import { ActionInvokerConfiguration } from './ActionInvokerConfiguration';
import { ActionInvokerConfigurationError } from '../errors/ActionInvokerErrors';

export class ActionInvokerBuilder {
  private _controllerRegistry?: ControllerRegistry | undefined;
  private _logger?: Logger | undefined;

  public setControllerRegistry(registry: ControllerRegistry): this {
    this._controllerRegistry = registry;
    return this;
  }

  public setLogger(logger: Logger): this {
    this._logger = logger;
    return this;
  }

  public build(): ActionInvokerConfiguration {
    if (!this._controllerRegistry) {
      throw new ActionInvokerConfigurationError(
        'ActionInvokerBuilder: ControllerRegistry is required.',
      );
    }

    return new ActionInvokerConfiguration({
      controllerRegistry: this._controllerRegistry,
      logger: this._logger,
    });
  }
}
