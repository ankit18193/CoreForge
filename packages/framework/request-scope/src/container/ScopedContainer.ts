import {
  ServiceRegistry,
  ServiceLifetime,
  ServiceNotFoundError,
  ServiceDescriptor,
} from '@coreforge/container';
import { Container } from '@coreforge/contracts';

import { ResolutionCache } from '../internal/ResolutionCache';
import { ScopeResolutionContext } from '../resolver/ScopeResolutionContext';

export class ScopedContainer implements Container {
  private readonly _parent: Container;
  private readonly _cache = new ResolutionCache();
  private readonly _registry: ServiceRegistry;

  constructor(parent: Container) {
    this._parent = parent;
    const parentRecord = parent as unknown as Record<string, unknown>;
    this._registry = parentRecord._registry as ServiceRegistry;
    if (!this._registry) {
      this._registry = new ServiceRegistry();
    }
  }

  public get parent(): Container {
    return this._parent;
  }

  public get cache(): ResolutionCache {
    return this._cache;
  }

  public has(token: unknown): boolean {
    return this._cache.has(token) || this._parent.has(token);
  }

  public resolve<T>(token: unknown): T {
    return this.resolveWithContext<T>(token, new ScopeResolutionContext());
  }

  public resolveWithContext<T>(token: unknown, context: ScopeResolutionContext): T {
    context.push(token);

    try {
      if (this._cache.has(token)) {
        return this._cache.get(token) as T;
      }

      const descriptor = this._registry.getDescriptor(token);
      if (!descriptor) {
        return this._parent.resolve<T>(token);
      }

      const lifetime = descriptor.lifetime;

      if (lifetime === ServiceLifetime.SINGLETON) {
        return this._parent.resolve<T>(token);
      }

      if (lifetime === ServiceLifetime.TRANSIENT) {
        return this.instantiate<T>(descriptor, context);
      }

      if (lifetime === ServiceLifetime.SCOPED) {
        const instance = this.instantiate<T>(descriptor, context);
        this._cache.set(token, instance);
        return instance;
      }

      return this._parent.resolve<T>(token);
    } finally {
      context.pop();
    }
  }

  private instantiate<T>(
    descriptor: ServiceDescriptor,
    context: ScopeResolutionContext,
  ): T {
    if (descriptor.useValue !== undefined) {
      return descriptor.useValue as T;
    }

    if (descriptor.useFactory !== undefined) {
      return descriptor.useFactory(this) as T;
    }

    if (descriptor.useClass !== undefined) {
      const depsTokens = (descriptor.dependencies || []) as unknown[];
      const dependencies = depsTokens.map((depToken) =>
        this.resolveWithContext(depToken, context),
      );
      return new descriptor.useClass(...dependencies) as T;
    }

    throw new ServiceNotFoundError(`Cannot instantiate token: ${String(descriptor.token)}`);
  }
}
