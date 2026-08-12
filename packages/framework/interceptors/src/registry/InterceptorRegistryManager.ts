import { InterceptorDescriptor } from './InterceptorDescriptor';
import { InterceptorRegistry } from './InterceptorRegistry';
import { InterceptorScope } from './InterceptorScope';
import { InterceptorConfigurationError } from '../errors/InterceptorErrors';

export class InterceptorRegistryManager {
  private readonly _registry: InterceptorRegistry;

  constructor(registry: InterceptorRegistry) {
    this._registry = registry;
  }

  public register(descriptor: InterceptorDescriptor): void {
    const list = this._registry.getDescriptors();
    const duplicate = list.find((d) => d.id === descriptor.id);
    if (duplicate) {
      throw new InterceptorConfigurationError(
        `InterceptorRegistryManager: Duplicate interceptor registration for id "${descriptor.id}".`,
      );
    }
    this._registry.add(descriptor);
  }

  public getSortedDescriptors(): readonly InterceptorDescriptor[] {
    const scopePrecedence: Record<InterceptorScope, number> = {
      [InterceptorScope.GLOBAL]: 1,
      [InterceptorScope.MODULE]: 2,
      [InterceptorScope.CONTROLLER]: 3,
      [InterceptorScope.ACTION]: 4,
    };

    const list = [...this._registry.getDescriptors()];

    return list
      .map((descriptor, index) => ({ descriptor, index }))
      .sort((a, b) => {
        const scopeA = scopePrecedence[a.descriptor.scope];
        const scopeB = scopePrecedence[b.descriptor.scope];
        if (scopeA !== scopeB) {
          return scopeA - scopeB;
        }
        if (a.descriptor.priority !== b.descriptor.priority) {
          return a.descriptor.priority - b.descriptor.priority;
        }
        return a.index - b.index;
      })
      .map((item) => item.descriptor);
  }
}
