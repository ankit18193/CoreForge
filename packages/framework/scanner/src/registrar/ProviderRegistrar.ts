import { ProviderModel } from '@coreforge/compiler/src/model/ProviderModel';
import { RegistrationDescriptor } from '@coreforge/contracts';

export interface ProviderRegistration extends RegistrationDescriptor {
  readonly parentId: string;
  readonly serviceToken: string;
  readonly scope: string;
}

export class ProviderRegistrar {
  public register(model: ProviderModel): ProviderRegistration {
    const reg = {
      id: model.id,
      type: 'PROVIDER',
      parentId: model.parentId,
      serviceToken: model.serviceToken,
      scope: model.scope,
    };
    Object.freeze(reg);
    return reg;
  }
}
