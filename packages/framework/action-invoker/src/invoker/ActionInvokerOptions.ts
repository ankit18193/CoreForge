import { Logger } from '@coreforge/contracts';
import { ControllerRegistry } from '@coreforge/controllers';

export interface ActionInvokerOptions {
  readonly controllerRegistry: ControllerRegistry;
  readonly logger?: Logger | undefined;
}
