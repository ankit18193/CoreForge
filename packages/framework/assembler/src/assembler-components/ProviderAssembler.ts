import { RegistrationDescriptor } from '@coreforge/contracts';

import { RuntimeProvider } from '../model/RuntimeProvider';

export class ProviderAssembler {
  public assemble(desc: RegistrationDescriptor): RuntimeProvider {
    const parentId = (desc as { parentId?: string }).parentId || '';
    const serviceToken = (desc as { serviceToken?: string }).serviceToken || desc.id;
    const scope = (desc as { scope?: string }).scope || 'SINGLETON';
    return new RuntimeProvider(desc.id, parentId, serviceToken, scope);
  }
}
