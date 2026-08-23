import { ShutdownCoordinator } from './ShutdownCoordinator';
import { RuntimeLifecycleManager } from '../lifecycle/RuntimeLifecycleManager';
import { RuntimeComponentRegistry } from '../registry/RuntimeComponentRegistry';
import { ShutdownOptions } from '../types/runtimeTypes';

export class GracefulShutdownManager {
  private readonly _registry: RuntimeComponentRegistry;
  private readonly _lifecycle: RuntimeLifecycleManager;
  private readonly _options: ShutdownOptions;

  constructor(
    registry: RuntimeComponentRegistry,
    lifecycle: RuntimeLifecycleManager,
    options: ShutdownOptions = {},
  ) {
    this._registry = registry;
    this._lifecycle = lifecycle;
    this._options = options;
  }

  public async shutdown(overrideOptions: ShutdownOptions = {}): Promise<void> {
    const opts = { ...this._options, ...overrideOptions };
    await ShutdownCoordinator.executeShutdown(this._registry, this._lifecycle, opts);
  }
}
