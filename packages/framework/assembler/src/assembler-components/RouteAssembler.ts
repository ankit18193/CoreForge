import { RegistrationDescriptor } from '@coreforge/contracts';

import { RuntimeRoute } from '../model/RuntimeRoute';

export class RouteAssembler {
  public assemble(desc: RegistrationDescriptor): RuntimeRoute {
    const parentId = (desc as { parentId?: string }).parentId || '';
    const path = (desc as { path?: string }).path || '';
    const method = (desc as { method?: string }).method || 'GET';
    return new RuntimeRoute(desc.id, parentId, path, method);
  }
}
