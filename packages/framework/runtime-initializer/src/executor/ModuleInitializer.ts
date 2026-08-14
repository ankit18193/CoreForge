import { RuntimeRegistry } from '../registry/RuntimeRegistry';
import { InitializationRollbackManager } from '../rollback/InitializationRollbackManager';

export class ModuleInitializer {
  public async initialize(
    desc: { id: string; name?: string; dependencies?: readonly string[] },
    registry: RuntimeRegistry,
    rollback: InitializationRollbackManager,
  ): Promise<void> {
    const instance = {
      id: desc.id,
      name: desc.name || desc.id,
      dependencies: desc.dependencies || [],
      state: 'INITIALIZED',
    };
    registry.registerModule(desc.id, instance);
    rollback.track(desc.id, 'MODULE', () => {
      instance.state = 'ROLLED_BACK';
    });
  }
}
