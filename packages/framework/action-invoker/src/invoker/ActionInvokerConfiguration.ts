import { Logger } from '@coreforge/contracts';
import { ControllerRegistry } from '@coreforge/controllers';

import { ActionInvokerOptions } from './ActionInvokerOptions';

export class ActionInvokerConfiguration {
  public readonly controllerRegistry: ControllerRegistry;
  public readonly logger?: Logger | undefined;

  constructor(options: ActionInvokerOptions) {
    this.controllerRegistry = options.controllerRegistry;
    this.logger = options.logger;
    Object.freeze(this);
  }
}
