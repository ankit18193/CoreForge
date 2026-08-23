import { RuntimeBootstrapError } from '../errors/RuntimeErrors';
import { RuntimeComponentRegistry } from '../registry/RuntimeComponentRegistry';

export class BootstrapValidator {
  public static validate(registry: RuntimeComponentRegistry): void {
    if (!registry) {
      throw new RuntimeBootstrapError('Cannot validate null or undefined component registry.');
    }

    try {
      registry.validateRequired();
    } catch (err) {
      throw new RuntimeBootstrapError(
        `Bootstrap validation failed: ${err instanceof Error ? err.message : String(err)}`,
        err,
      );
    }
  }
}
