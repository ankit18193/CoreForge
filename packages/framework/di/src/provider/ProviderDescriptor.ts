import {
  Constructor,
  InjectionToken,
  PropertyInjection,
  ProviderDescriptor as IProviderDescriptor,
  ProviderScope,
} from '../types/dependencyTypes';

export class TokenFormatter {
  public static format(token: InjectionToken): string {
    if (typeof token === 'string') {
      return token;
    }
    if (typeof token === 'symbol') {
      return token.description || token.toString();
    }
    if (typeof token === 'function') {
      return token.name || 'AnonymousFunction';
    }
    return String(token);
  }

  public static toKey(token: InjectionToken): string | symbol {
    if (typeof token === 'string' || typeof token === 'symbol') {
      return token;
    }
    if (typeof token === 'function') {
      return token.name || TokenFormatter.format(token);
    }
    return TokenFormatter.format(token);
  }
}

export class ProviderDescriptorHelper {
  public static create<T>(descriptor: IProviderDescriptor<T>): Readonly<IProviderDescriptor<T>> {
    const deps = descriptor.dependencies ? Object.freeze([...descriptor.dependencies]) : undefined;

    const propInjections = descriptor.propertyInjections
      ? Object.freeze(
          descriptor.propertyInjections.map((p) =>
            Object.freeze({
              propertyKey: p.propertyKey,
              token: p.token,
            }),
          ),
        )
      : undefined;

    const desc: IProviderDescriptor<T> = {
      token: descriptor.token,
      useClass: descriptor.useClass,
      useValue: descriptor.useValue,
      useFactory: descriptor.useFactory,
      dependencies: deps,
      propertyInjections: propInjections,
      scope: descriptor.scope || 'SINGLETON',
    };

    return Object.freeze(desc);
  }

  public static createClassProvider<T>(
    token: InjectionToken<T>,
    useClass: Constructor<T>,
    scope: ProviderScope = 'SINGLETON',
    dependencies?: readonly InjectionToken[],
    propertyInjections?: readonly PropertyInjection[],
  ): Readonly<IProviderDescriptor<T>> {
    return ProviderDescriptorHelper.create({
      token,
      useClass,
      scope,
      dependencies,
      propertyInjections,
    });
  }

  public static createValueProvider<T>(
    token: InjectionToken<T>,
    useValue: T,
    scope: ProviderScope = 'SINGLETON',
  ): Readonly<IProviderDescriptor<T>> {
    return ProviderDescriptorHelper.create({
      token,
      useValue,
      scope,
    });
  }

  public static createFactoryProvider<T>(
    token: InjectionToken<T>,
    useFactory: (...args: unknown[]) => T | Promise<T>,
    dependencies?: readonly InjectionToken[],
    scope: ProviderScope = 'SINGLETON',
  ): Readonly<IProviderDescriptor<T>> {
    return ProviderDescriptorHelper.create({
      token,
      useFactory,
      dependencies,
      scope,
    });
  }
}
