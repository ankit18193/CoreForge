import { RuntimeLifecycleManager } from '../lifecycle/RuntimeLifecycleManager';
import { RuntimeComponentRegistry } from '../registry/RuntimeComponentRegistry';
import { ShutdownOptions } from '../types/runtimeTypes';

export class ShutdownCoordinator {
  public static async executeShutdown(
    registry: RuntimeComponentRegistry,
    lifecycle: RuntimeLifecycleManager,
    options: ShutdownOptions = {},
  ): Promise<void> {
    const timeoutMs = options.timeoutMs ?? 5000;

    // 1. Mark STOPPING to reject new requests
    lifecycle.setStopping();

    // 2. Drain active requests
    await lifecycle.waitForDrain(timeoutMs);

    // 3. Stop stateful subsystems that expose lifecycle APIs
    const components = registry.snapshot();

    // A. Stop transport lifecycle
    if (components.transportPipeline && components.transportPipeline.lifecycle) {
      if (typeof components.transportPipeline.lifecycle.stop === 'function') {
        try {
          await Promise.resolve(components.transportPipeline.lifecycle.stop(timeoutMs));
        } catch {
          // Suppress shutdown errors
        }
      }
    }

    // B. Stop routing lifecycle
    if (components.routeMatcher && components.routeMatcher.lifecycle) {
      if (typeof components.routeMatcher.lifecycle.stop === 'function') {
        try {
          components.routeMatcher.lifecycle.stop();
        } catch {
          // Suppress shutdown errors
        }
      }
    }

    // C. Stop DI container
    if (components.container && typeof components.container.stop === 'function') {
      try {
        await Promise.resolve(components.container.stop());
      } catch {
        // Suppress shutdown errors
      }
    }

    // 4. Mark STOPPED
    lifecycle.setStopped();
  }
}
