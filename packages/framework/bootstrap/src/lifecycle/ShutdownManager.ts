import { ModuleLoader } from '@coreforge/modules';
import { Runtime } from '@coreforge/runtime';

import { BootstrapExecutionContext } from '../pipeline/BootstrapExecutionContext';

export class ShutdownManager {
  public async shutdown(context: BootstrapExecutionContext): Promise<void> {
    if (context.registry.has('ModuleLoader')) {
      const moduleLoader = context.registry.get<ModuleLoader>('ModuleLoader');
      if (moduleLoader.stop) {
        await moduleLoader.stop();
      }
    }

    if (context.registry.has('Runtime')) {
      const runtime = context.registry.get<Runtime>('Runtime');
      if (runtime.stop) {
        await runtime.stop();
      }
    }
  }
}
