import { RegistrationDescriptor } from '@coreforge/contracts';

import { RuntimeController } from '../model/RuntimeController';

export class ControllerAssembler {
  public assemble(desc: RegistrationDescriptor): RuntimeController {
    const name = (desc as { name?: string }).name || desc.id;
    const parentId = (desc as { parentId?: string }).parentId || '';
    return new RuntimeController(desc.id, name, parentId);
  }
}
