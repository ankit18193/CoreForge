import { RuntimeShutdownError } from '../errors/RuntimeExecutionErrors';
import { RuntimeExecutionRegistry } from '../registry/RuntimeExecutionRegistry';

export class ShutdownExecutor {
  public async execute(registry: RuntimeExecutionRegistry): Promise<void> {
    try {
      const active = registry.getActiveComponents();
      const reversed = [...active].reverse();
      for (const comp of reversed) {
        (comp as { state?: string }).state = 'STOPPED';
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new RuntimeShutdownError(`ShutdownExecutor: Shutdown sequence failed: ${msg}`, {
        cause: err as Record<string, unknown>,
      });
    }
  }
}
