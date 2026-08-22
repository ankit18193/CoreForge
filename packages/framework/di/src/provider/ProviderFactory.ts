import { TokenFormatter } from './ProviderDescriptor';
import { DependencyResolutionError } from '../errors/DependencyErrors';
import { ProviderDescriptor } from '../types/dependencyTypes';

export class ProviderFactory {
  public static async createInstance<T>(
    descriptor: Readonly<ProviderDescriptor<T>>,
    resolvedArgs: readonly unknown[] = [],
  ): Promise<T> {
    const tokenName = TokenFormatter.format(descriptor.token);

    if (descriptor.useValue !== undefined) {
      return descriptor.useValue;
    }

    if (descriptor.useFactory !== undefined) {
      try {
        const result = descriptor.useFactory(...resolvedArgs);
        return await Promise.resolve(result);
      } catch (err) {
        throw new DependencyResolutionError(
          tokenName,
          `Error executing factory function: ${err instanceof Error ? err.message : String(err)}`,
          err,
        );
      }
    }

    if (descriptor.useClass !== undefined) {
      try {
        const Cls = descriptor.useClass;
        return new Cls(...(resolvedArgs as never[]));
      } catch (err) {
        throw new DependencyResolutionError(
          tokenName,
          `Error instantiating class constructor: ${err instanceof Error ? err.message : String(err)}`,
          err,
        );
      }
    }

    throw new DependencyResolutionError(
      tokenName,
      'Provider descriptor does not have a valid provider target.',
    );
  }
}
