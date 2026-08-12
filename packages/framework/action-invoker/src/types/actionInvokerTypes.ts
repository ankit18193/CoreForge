import { ActionArguments, RequestScope } from '@coreforge/contracts';
import { ActionDescriptor, ControllerDescriptor } from '@coreforge/controllers';

export interface InvocationDescriptorParams {
  readonly controllerDescriptor: ControllerDescriptor;
  readonly actionDescriptor: ActionDescriptor;
  readonly args: ActionArguments;
  readonly scope: RequestScope;
}
