import { ModuleLoader } from '@coreforge/modules';
import { Runtime } from '@coreforge/runtime';

import { BootstrapTimeoutError } from '../errors/BootstrapErrors';
import { BootstrapExecutionContext } from '../pipeline/BootstrapExecutionContext';
import { BootstrapPipeline } from '../pipeline/BootstrapPipeline';

export class StartupManager {
  private readonly _pipeline: BootstrapPipeline;

  constructor(pipeline: BootstrapPipeline) {
    this._pipeline = pipeline;
  }

  public async startup(
    context: BootstrapExecutionContext,
    timeoutMs?: number | undefined,
  ): Promise<void> {
    context.profiler.startTotal();

    if (timeoutMs !== undefined && timeoutMs > 0) {
      let timeoutId: NodeJS.Timeout | undefined;
      const timeoutPromise = new Promise<void>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new BootstrapTimeoutError(`Bootstrap startup timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      try {
        await Promise.race([this._pipeline.execute(context), timeoutPromise]);
      } catch (err: unknown) {
        await this.rollback(context);
        throw err;
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        context.profiler.endTotal();
      }
    } else {
      try {
        await this._pipeline.execute(context);
      } catch (err: unknown) {
        await this.rollback(context);
        throw err;
      } finally {
        context.profiler.endTotal();
      }
    }
  }

  private async rollback(context: BootstrapExecutionContext): Promise<void> {
    if (context.registry.has('ModuleLoader')) {
      try {
        const moduleLoader = context.registry.get<ModuleLoader>('ModuleLoader');
        if (moduleLoader.stop) {
          await moduleLoader.stop();
        }
      } catch (rollbackErr) {
        // Rollback error should not overwrite the original failure
      }
    }

    if (context.registry.has('Runtime')) {
      try {
        const runtime = context.registry.get<Runtime>('Runtime');
        if (runtime.stop) {
          await runtime.stop();
        }
      } catch (rollbackErr) {
        // Safe check
      }
    }
  }
}
