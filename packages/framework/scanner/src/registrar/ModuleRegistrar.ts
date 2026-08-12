import { ModuleModel } from '@coreforge/compiler/src/model/ModuleModel';
import { RegistrationDescriptor } from '@coreforge/contracts';

export interface ModuleRegistration extends RegistrationDescriptor {
  readonly name: string;
  readonly dependencies: readonly string[];
}

export class ModuleRegistrar {
  public register(model: ModuleModel): ModuleRegistration {
    const reg = {
      id: model.id,
      type: 'MODULE',
      name: model.name,
      dependencies: model.dependencies,
    };
    Object.freeze(reg);
    return reg;
  }
}
