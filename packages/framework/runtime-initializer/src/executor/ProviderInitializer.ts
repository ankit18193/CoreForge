import { RuntimeRegistry } from '../registry/RuntimeRegistry';
import { InitializationRollbackManager } from '../rollback/InitializationRollbackManager';

export class ProviderInitializer {
  public async initialize(
    desc: {
      id: string;
      parentId?: string;
      serviceToken?: string;
      scope?: string;
    },
    registry: RuntimeRegistry,
    rollback: InitializationRollbackManager,
  ): Promise<void> {
    const instance = {
      id: desc.id,
      parentId: desc.parentId || '',
      serviceToken: desc.serviceToken || desc.id,
      scope: desc.scope || 'SINGLETON',
      state: 'INITIALIZED',
    };
    registry.registerProvider(desc.id, instance);
    rollback.track(desc.id, 'PROVIDER', () => {
      instance.state = 'ROLLED_BACK';
    });
  }
}
