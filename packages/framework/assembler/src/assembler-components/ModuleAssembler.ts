import { RegistrationDescriptor } from '@coreforge/contracts';

import { RuntimeModule } from '../model/RuntimeModule';

export class ModuleAssembler {
  public assemble(desc: RegistrationDescriptor): RuntimeModule {
    const name = (desc as { name?: string }).name || desc.id;
    const dependencies = (desc as { dependencies?: readonly string[] }).dependencies || [];
    return new RuntimeModule(desc.id, name, dependencies);
  }
}
