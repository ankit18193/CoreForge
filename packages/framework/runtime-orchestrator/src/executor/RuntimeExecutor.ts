import { InitializedRuntime } from '@coreforge/contracts';

import { ShutdownExecutor } from './ShutdownExecutor';
import { StartupExecutor } from './StartupExecutor';
import { RuntimeExecutionRegistry } from '../registry/RuntimeExecutionRegistry';
import { RuntimeShutdownRollbackManager } from '../rollback/RuntimeShutdownRollbackManager';

export class RuntimeExecutor {
  private readonly _startup = new StartupExecutor();
  private readonly _shutdown = new ShutdownExecutor();

  public async start(
    runtime: InitializedRuntime,
    registry: RuntimeExecutionRegistry,
    rollback: RuntimeShutdownRollbackManager,
  ): Promise<void> {
    await this._startup.execute(runtime, registry, rollback);
  }

  public async stop(registry: RuntimeExecutionRegistry): Promise<void> {
    await this._shutdown.execute(registry);
  }
}
