import { ErrorHandlingEngine, ExecutionContext } from '../types/kernelTypes';

export class KernelErrorBoundary {
  public static async handleError(
    error: unknown,
    context: ExecutionContext,
    errorEngine?: ErrorHandlingEngine,
  ): Promise<void> {
    if (errorEngine && errorEngine.ready) {
      try {
        await errorEngine.process(error, { context });
      } catch {
        // Suppress secondary error boundary failure to preserve original error
      }
    }
  }
}
