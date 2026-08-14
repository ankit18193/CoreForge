import { RuntimeRegistry } from '../registry/RuntimeRegistry';
import { InitializationRollbackManager } from '../rollback/InitializationRollbackManager';

export class SecurityInitializer {
  public async initialize(
    desc: { id: string; parentId?: string },
    registry: RuntimeRegistry,
    rollback: InitializationRollbackManager,
  ): Promise<void> {
    const instance = {
      id: desc.id,
      parentId: desc.parentId || '',
      state: 'INITIALIZED',
    };
    registry.registerSecurity(instance);
    rollback.track(desc.id, 'SECURITY', () => {
      instance.state = 'ROLLED_BACK';
    });
  }
}
