import { ActionArguments, RequestScope } from '@coreforge/contracts';
import { ActionDescriptor, ControllerDescriptor } from '@coreforge/controllers';

import { InvocationDescriptorParams } from '../types/actionInvokerTypes';

export class InvocationDescriptor {
  public readonly controllerDescriptor: ControllerDescriptor;
  public readonly actionDescriptor: ActionDescriptor;
  public readonly args: ActionArguments;
  public readonly scope: RequestScope;

  constructor(params: InvocationDescriptorParams) {
    this.controllerDescriptor = params.controllerDescriptor;
    this.actionDescriptor = params.actionDescriptor;
    this.args = params.args;
    this.scope = params.scope;
    Object.freeze(this);
  }
}
