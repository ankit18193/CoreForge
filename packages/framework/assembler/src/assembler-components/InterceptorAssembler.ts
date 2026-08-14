import { RegistrationDescriptor } from '@coreforge/contracts';

export class InterceptorAssembler {
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
