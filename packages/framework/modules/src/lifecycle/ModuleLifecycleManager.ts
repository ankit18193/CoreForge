import { ModuleDescriptor, ModuleState } from '../descriptors/ModuleDescriptor';
import { ModuleLifecycleError } from '../errors/ModuleErrors';

export type LifecyclePhase =
  | 'Registered'
  | 'Configured'
  | 'Initialized'
  | 'Started'
  | 'Ready'
  | 'Stopping'
  | 'Shutdown'
  | 'Disposed';

export class ModuleLifecycleManager {
  public async executePhase(
    phase: LifecyclePhase,
    descriptors: ModuleDescriptor[],
    configContext?: unknown,
  ): Promise<void> {
    for (const desc of descriptors) {
      try {
        switch (phase) {
          case 'Registered':
            if (desc.instance.onRegistered) {
              await desc.instance.onRegistered();
            }
            desc.transitionTo(ModuleState.REGISTERED);
            break;
          case 'Configured':
            if (desc.instance.onConfigured) {
              await desc.instance.onConfigured(configContext);
            }
            desc.transitionTo(ModuleState.CONFIGURED);
            break;
          case 'Initialized':
            if (desc.instance.onInitialized) {
              await desc.instance.onInitialized();
            }
            desc.transitionTo(ModuleState.INITIALIZED);
            break;
          case 'Started':
            if (desc.instance.onStarted) {
              await desc.instance.onStarted();
            }
            desc.transitionTo(ModuleState.STARTED);
            break;
          case 'Ready':
            if (desc.instance.onReady) {
              await desc.instance.onReady();
            }
            desc.transitionTo(ModuleState.READY);
            break;
          case 'Stopping':
            if (desc.instance.onStopping) {
              await desc.instance.onStopping();
            }
            desc.transitionTo(ModuleState.STOPPING);
            break;
          case 'Shutdown':
            if (desc.instance.onShutdown) {
              await desc.instance.onShutdown();
            }
            desc.transitionTo(ModuleState.SHUTDOWN);
            break;
          case 'Disposed':
            if (desc.instance.onDisposed) {
              await desc.instance.onDisposed();
            }
            desc.transitionTo(ModuleState.DISPOSED);
            break;
        }
      } catch (err: unknown) {
        desc.transitionTo(ModuleState.FAILED);
        const cause = err instanceof Error ? err : new Error(String(err));
        throw new ModuleLifecycleError(
          `Failed to execute phase "${phase}" for module "${desc.metadata.name}": ${cause.message}`,
          cause,
          { module: desc.metadata.name, stage: phase },
        );
      }
    }
  }
}
