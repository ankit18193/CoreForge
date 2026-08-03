import { Container } from '@coreforge/contracts';

import { ResolutionContext } from './ResolutionContext';
import { ServiceNotFoundError } from '../errors/ContainerErrors';
import { ServiceLifetime } from '../lifetimes/ServiceLifetime';
import { ServiceRegistry } from '../registry/ServiceRegistry';

export class ServiceResolver {
  private _registry: ServiceRegistry;
  private _container: Container;

  constructor(registry: ServiceRegistry, container: Container) {
    this._registry = registry;
    this._container = container;
  }

  public resolve<T>(token: unknown, context?: ResolutionContext): T {
    const activeContext = context || new ResolutionContext();

    activeContext.push(token);

    try {
      const descriptor = this._registry.getDescriptor(token);
      if (!descriptor) {
        throw new ServiceNotFoundError(
          `Service not found in container for token: ${this.getTokenName(token)}`,
          { token },
        );
      }

      if (descriptor.lifetime === ServiceLifetime.SINGLETON) {
        const cached = this._registry.getSingleton(token);
        if (cached !== undefined) {
          return cached as T;
        }
      }

      if (descriptor.lifetime === ServiceLifetime.SCOPED) {
        const cached = this._registry.getSingleton(token);
        if (cached !== undefined) {
          return cached as T;
        }
      }

      let instance: T;

      if (descriptor.useValue !== undefined) {
        instance = descriptor.useValue as unknown as T;
      } else if (descriptor.useFactory !== undefined) {
        instance = descriptor.useFactory(this._container) as unknown as T;
      } else if (descriptor.useClass !== undefined) {
        const depsTokens = descriptor.dependencies || [];
        const dependencies = depsTokens.map((depToken) => this.resolve(depToken, activeContext));
        instance = new descriptor.useClass(...dependencies) as unknown as T;
      } else {
        throw new Error(
          `Invalid service descriptor configuration for token: ${this.getTokenName(token)}`,
        );
      }

      if (
        descriptor.lifetime === ServiceLifetime.SINGLETON ||
        descriptor.lifetime === ServiceLifetime.SCOPED
      ) {
        this._registry.setSingleton(token, instance);
      }

      return instance;
    } finally {
      activeContext.pop();
    }
  }

  private getTokenName(token: unknown): string {
    if (typeof token === 'string') {
      return token;
    }
    if (typeof token === 'symbol') {
      return token.description || token.toString();
    }
    if (token && typeof token === 'object' && 'description' in token) {
      return (token as { description: string }).description;
    }
    if (typeof token === 'function') {
      return token.name;
    }
    return String(token);
  }
}
