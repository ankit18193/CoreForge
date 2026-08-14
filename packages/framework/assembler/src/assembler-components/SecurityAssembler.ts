import { RegistrationDescriptor } from '@coreforge/contracts';

export class SecurityAssembler {
  public assemble(desc: RegistrationDescriptor): unknown {
    const reg = {
      id: desc.id,
      type: desc.type,
      parentId: (desc as { parentId?: string }).parentId || '',
    };
    Object.freeze(reg);
    return reg;
  }
}
