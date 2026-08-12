import { ControllerModel } from '@coreforge/compiler/src/model/ControllerModel';
import { RegistrationDescriptor } from '@coreforge/contracts';

export interface ControllerRegistration extends RegistrationDescriptor {
  readonly parentId: string;
  readonly name: string;
}

export class ControllerRegistrar {
  public register(model: ControllerModel): ControllerRegistration {
    const reg = {
      id: model.id,
      type: 'CONTROLLER',
      parentId: model.parentId,
      name: model.name,
    };
    Object.freeze(reg);
    return reg;
  }
}
