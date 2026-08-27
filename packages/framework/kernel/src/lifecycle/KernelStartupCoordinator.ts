import { KernelDiagnostics } from '../diagnostics/KernelDiagnostics';
import { KernelStartupError, KernelTimeoutError } from '../errors/KernelErrors';
import { KernelProfiler } from '../internal/KernelProfiler';
import { KernelComponentRegistry } from '../registry/KernelComponentRegistry';
import { KernelComponentResolver } from '../registry/KernelComponentResolver';
import { KernelStartOptions, RegisteredKernelComponentEntry } from '../types/kernelTypes';

export class KernelStartupCoordinator {
  public static async start(
    registry: KernelComponentRegistry,
    diagnostics: KernelDiagnostics,
    options?: KernelStartOptions,
  ): Promise<void> {
    const profiler = new KernelProfiler().start();
    diagnostics.recordStartAttempt();

    let startupOrder: readonly RegisteredKernelComponentEntry[];
    try {
      startupOrder = KernelComponentResolver.resolveStartupOrder(registry);
    } catch (err) {
      diagnostics.recordDependencyFailure();
      diagnostics.recordStartFailure();
      throw err;
    }

    const startedComponents: RegisteredKernelComponentEntry[] = [];
    const timeoutMs = options?.timeoutMs;

    try {
      const startupPromise = (async () => {
        for (const entry of startupOrder) {
          try {
            await entry.component.start();
            startedComponents.push(entry);
          } catch (err) {
            diagnostics.recordComponentStartFailure();
            throw new KernelStartupError(
              `Failed to start component "${entry.id}": ${err instanceof Error ? err.message : String(err)}`,
              { componentId: entry.id, error: err },
            );
          }
        }
      })();

      if (timeoutMs && timeoutMs > 0) {
        let timeoutId: NodeJS.Timeout | undefined;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(
              new KernelTimeoutError(`Kernel startup timed out after ${timeoutMs}ms`, {
                timeoutMs,
              }),
            );
          }, timeoutMs);
        });

        try {
          await Promise.race([startupPromise, timeoutPromise]);
        } finally {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
        }
      } else {
        await startupPromise;
      }

      diagnostics.recordStartSuccess(profiler.elapsedMs);
    } catch (err) {
      diagnostics.recordStartFailure();

      // Reverse-order rollback
      const rollbackOrder = [...startedComponents].reverse();
      for (const entry of rollbackOrder) {
        try {
          await entry.component.stop();
        } catch {
          diagnostics.recordComponentStopFailure();
        }
      }

      if (err instanceof KernelStartupError || err instanceof KernelTimeoutError) {
        throw err;
      }

      throw new KernelStartupError(
        `Kernel startup failed: ${err instanceof Error ? err.message : String(err)}`,
        { error: err },
      );
    }
  }
}
