import { RuntimeRegistry } from '../registry/RuntimeRegistry';
import { InitializationRollbackManager } from '../rollback/InitializationRollbackManager';

export class RouteInitializer {
  public async initialize(
    desc: { id: string; parentId?: string; path?: string; method?: string },
    registry: RuntimeRegistry,
    rollback: InitializationRollbackManager,
  ): Promise<void> {
    const instance = {
      id: desc.id,
      parentId: desc.parentId || '',
      path: desc.path || '',
      method: desc.method || 'GET',
      state: 'INITIALIZED',
    };
    registry.registerRoute(desc.id, instance);
    rollback.track(desc.id, 'ROUTE', () => {
      instance.state = 'ROLLED_BACK';
    });
  }
}
