import { TokenFormatter } from './ProviderDescriptor';
import { ProviderRegistry } from './ProviderRegistry';
import { ProviderNotFoundError } from '../errors/DependencyErrors';
import { InjectionToken, ProviderDescriptor } from '../types/dependencyTypes';

export class ProviderResolver {
  private readonly _registry: ProviderRegistry;

  constructor(registry: ProviderRegistry) {
    this._registry = registry;
  }

  public resolveDescriptor<T>(token: InjectionToken<T>): Readonly<ProviderDescriptor<T>> {
    const descriptor = this._registry.get(token);
    if (!descriptor) {
      const tokenName = TokenFormatter.format(token);
      throw new ProviderNotFoundError(tokenName);
    }
    return descriptor;
  }
}
