import { RouteModel } from '@coreforge/compiler/src/model/RouteModel';
import { RegistrationDescriptor } from '@coreforge/contracts';

export interface RouteRegistration extends RegistrationDescriptor {
  readonly parentId: string;
  readonly path: string;
  readonly method: string;
}

export class RouteRegistrar {
  public register(model: RouteModel): RouteRegistration {
    const reg = {
      id: model.id,
      type: 'ROUTE',
      parentId: model.parentId,
      path: model.path,
      method: model.method,
    };
    Object.freeze(reg);
    return reg;
  }
}
