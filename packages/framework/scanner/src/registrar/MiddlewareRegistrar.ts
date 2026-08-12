import { RegistrationDescriptor } from '@coreforge/contracts';

export interface MiddlewareRegistration extends RegistrationDescriptor {
  readonly parentId: string;
}

export class MiddlewareRegistrar {
  public register(desc: { id: string; parentId?: string }): MiddlewareRegistration {
    const reg = {
      id: desc.id,
      type: 'MIDDLEWARE',
      parentId: desc.parentId || '',
    };
    Object.freeze(reg);
    return reg;
  }
}
