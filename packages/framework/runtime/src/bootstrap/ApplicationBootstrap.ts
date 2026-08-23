import { BootstrapValidator } from './BootstrapValidator';
import { RuntimeStartupError } from '../errors/RuntimeErrors';
import { RuntimeLifecycleManager } from '../lifecycle/RuntimeLifecycleManager';
import { RuntimeComponentRegistry } from '../registry/RuntimeComponentRegistry';
import { BootstrapOptions, BootstrapStage } from '../types/runtimeTypes';

export class ApplicationBootstrap {
  public static async bootstrap(
    registry: RuntimeComponentRegistry,
    lifecycle: RuntimeLifecycleManager,
    _options: BootstrapOptions = {},
  ): Promise<void> {
    let currentStage: BootstrapStage = 'VALIDATION';
    const initializedResources: { dispose: () => Promise<void> | void }[] = [];

    try {
      // 1. Validation Stage
      currentStage = 'VALIDATION';
      lifecycle.setValidating();
      BootstrapValidator.validate(registry);

      // 2. Compilation Stage
      currentStage = 'COMPILING';
      lifecycle.setCompiling();

      // 3. Initializing Stage
      currentStage = 'INITIALIZING';
      lifecycle.setInitializing();

      const container = registry.container;
      if (container && typeof container.makeReady === 'function') {
        container.makeReady();
        initializedResources.push({
          dispose: () => container.stop(),
        });
      }

      const routeMatcher = registry.routeMatcher;
      if (
        routeMatcher &&
        routeMatcher.lifecycle &&
        typeof routeMatcher.lifecycle.makeReady === 'function'
      ) {
        if (
          routeMatcher.lifecycle.state === 'CREATED' ||
          routeMatcher.lifecycle.state === 'COMPILING'
        ) {
          routeMatcher.lifecycle.makeReady();
        }
      }

      const transport = registry.transportPipeline;
      if (transport && transport.lifecycle && typeof transport.lifecycle.makeReady === 'function') {
        if (transport.lifecycle.state === 'CREATED') {
          transport.lifecycle.makeReady();
        }
      }

      // Lock registry so components cannot be mutated after startup
      registry.lock();

      // 4. Mark Ready
      lifecycle.setReady();
    } catch (err) {
      lifecycle.setFailed();

      // Safe Rollback: clean up only successfully initialized application-level resources
      for (const res of initializedResources.reverse()) {
        try {
          await Promise.resolve(res.dispose());
        } catch {
          // Suppress secondary rollback errors to preserve primary cause
        }
      }

      throw new RuntimeStartupError(
        err instanceof Error ? err.message : String(err),
        currentStage,
        err,
      );
    }
  }
}
