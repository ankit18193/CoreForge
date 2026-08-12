import { RegistrationDescriptor } from '@coreforge/contracts';

export interface InterceptorRegistration extends RegistrationDescriptor {
  readonly parentId: string;
}

export class InterceptorRegistrar {
  public register(desc: { id: string; parentId?: string }): InterceptorRegistration {
    const reg = {
      id: desc.id,
      type: 'INTERCEPTOR',
      parentId: desc.parentId || '',
    };
    Object.freeze(reg);
    return reg;
  }
}
