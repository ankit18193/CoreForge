import { RegistrationDescriptor } from '@coreforge/contracts';

export interface SecurityRegistration extends RegistrationDescriptor {
  readonly parentId: string;
}

export class SecurityRegistrar {
  public register(desc: { id: string; parentId?: string }): SecurityRegistration {
    const reg = {
      id: desc.id,
      type: 'SECURITY',
      parentId: desc.parentId || '',
    };
    Object.freeze(reg);
    return reg;
  }
}
