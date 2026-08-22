import { Container } from './Container';
import { ContainerOptions } from './ContainerOptions';
import {
  Constructor,
  Factory,
  InjectionToken,
  PropertyInjection,
  ProviderDescriptor,
  ProviderScope,
} from '../types/dependencyTypes';

export class ContainerBuilder {
  private _options: ContainerOptions = {};
  private readonly _providers: ProviderDescriptor<unknown>[] = [];

  public setOptions(options: ContainerOptions): this {
    this._options = { ...this._options, ...options };
    return this;
  }

  public register<T>(provider: ProviderDescriptor<T>): this {
    this._providers.push(provider as ProviderDescriptor<unknown>);
    return this;
  }

  public registerClass<T>(
    token: InjectionToken<T>,
    useClass: Constructor<T>,
    scope: ProviderScope = 'SINGLETON',
    dependencies?: readonly InjectionToken[],
    propertyInjections?: readonly PropertyInjection[],
  ): this {
    this._providers.push({
      token,
      useClass,
      scope,
      dependencies,
      propertyInjections,
    });
    return this;
  }

  public registerValue<T>(
    token: InjectionToken<T>,
    useValue: T,
    scope: ProviderScope = 'SINGLETON',
  ): this {
    this._providers.push({
      token,
      useValue,
      scope,
    });
    return this;
  }

  public registerFactory<T>(
    token: InjectionToken<T>,
    useFactory: Factory<T>,
    dependencies?: readonly InjectionToken[],
    scope: ProviderScope = 'SINGLETON',
  ): this {
    this._providers.push({
      token,
      useFactory,
      dependencies,
      scope,
    });
    return this;
  }

  public build(): Container {
    const container = new Container(this._options);
    for (const provider of this._providers) {
      container.register(provider);
    }
    return container;
  }
}
