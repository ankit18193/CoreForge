import { Container as IContainer } from '@coreforge/contracts';

import { ServiceLifetime } from '../lifetimes/ServiceLifetime';
import { ServiceRegistry } from '../registry/ServiceRegistry';
import { ServiceResolver } from '../resolver/ServiceResolver';
import { ServiceToken } from '../tokens/InjectionToken';
import { Registration } from '../types/containerTypes';

export class Container implements IContainer {
  private _registry: ServiceRegistry;
  private _resolver: ServiceResolver;

  constructor() {
    this._registry = new ServiceRegistry();
    this._resolver = new ServiceResolver(this._registry, this);
  }

  public register<T>(registration: Registration<T>): void {
    this._registry.register(registration);
  }

  public registerSingleton<T>(
    token: ServiceToken<T>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useClass: new (...args: any[]) => T,
    dependencies?: ServiceToken<unknown>[] | undefined,
  ): void {
    this._registry.register({
      token,
      useClass,
      dependencies,
      lifetime: ServiceLifetime.SINGLETON,
    });
  }

  public registerTransient<T>(
    token: ServiceToken<T>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useClass: new (...args: any[]) => T,
    dependencies?: ServiceToken<unknown>[] | undefined,
  ): void {
    this._registry.register({
      token,
      useClass,
      dependencies,
      lifetime: ServiceLifetime.TRANSIENT,
    });
  }

  public registerValue<T>(token: ServiceToken<T>, useValue: T): void {
    this._registry.register({
      token,
      useValue,
    });
  }

  public registerFactory<T>(
    token: ServiceToken<T>,
    useFactory: (container: IContainer) => T,
    lifetime?: ServiceLifetime,
  ): void {
    this._registry.register({
      token,
      useFactory,
      lifetime: lifetime || ServiceLifetime.SINGLETON,
    });
  }

  public resolve<T>(token: ServiceToken<T>): T {
    return this._resolver.resolve<T>(token);
  }

  public has(token: ServiceToken<unknown>): boolean {
    return this._registry.hasDescriptor(token);
  }

  public clear(): void {
    this._registry.clear();
  }
}
