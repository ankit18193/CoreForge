import { KernelDiagnostics } from '../diagnostics/KernelDiagnostics';
import { KernelProfiler } from '../internal/KernelProfiler';
import { KernelComponentRegistry } from '../registry/KernelComponentRegistry';
import { KernelComponentResolver } from '../registry/KernelComponentResolver';
import { KernelStopOptions } from '../types/kernelTypes';

export class KernelShutdownCoordinator {
  public static async stop(
    registry: KernelComponentRegistry,
    diagnostics: KernelDiagnostics,
    options?: KernelStopOptions,
  ): Promise<void> {
    const profiler = new KernelProfiler().start();
    diagnostics.recordStopAttempt();

    const timeoutMs = options?.timeoutMs ?? 5000;
    const isGraceful = options?.graceful ?? !options?.force;

    // 1. Graceful shutdown: wait for active operations to drain
    if (isGraceful && diagnostics.getSnapshot().activeOperations > 0 && timeoutMs > 0) {
      const startTime = Date.now();
      while (diagnostics.getSnapshot().activeOperations > 0) {
        if (Date.now() - startTime >= timeoutMs) {
          break; // Timeout exceeded, proceed to forced stop
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }

    // 2. Resolve reverse shutdown order
    let shutdownOrder;
    try {
      shutdownOrder = KernelComponentResolver.resolveShutdownOrder(registry);
    } catch {
      // If dependency resolution fails, fallback to reverse registered order
      shutdownOrder = [...registry.getAll()].reverse();
    }

    // 3. Stop each component in reverse dependency order
    for (const entry of shutdownOrder) {
      try {
        await entry.component.stop();
      } catch {
        diagnostics.recordComponentStopFailure();
      }
    }

    diagnostics.recordStopSuccess(profiler.elapsedMs);
  }
}
