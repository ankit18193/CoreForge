import { RuntimeRegistry } from '../registry/RuntimeRegistry';
import { InitializationRollbackManager } from '../rollback/InitializationRollbackManager';

export class ControllerInitializer {
  public async initialize(
    desc: { id: string; name?: string; parentId?: string },
    registry: RuntimeRegistry,
    rollback: InitializationRollbackManager,
  ): Promise<void> {
    const instance = {
      id: desc.id,
      name: desc.name || desc.id,
      parentId: desc.parentId || '',
      state: 'INITIALIZED',
    };
    registry.registerController(desc.id, instance);
    rollback.track(desc.id, 'CONTROLLER', () => {
      instance.state = 'ROLLED_BACK';
    });
  }
}
