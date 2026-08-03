import { Container } from '@coreforge/contracts';

import { DuplicateRegistrationError } from '../errors/ContainerErrors';
import { ServiceLifetime } from '../lifetimes/ServiceLifetime';
import { ServiceToken } from '../tokens/InjectionToken';
import { Registration, ServiceDescriptor } from '../types/containerTypes';

export class ServiceRegistry {
  private _descriptors = new Map<unknown, ServiceDescriptor>();
  private _singletons = new Map<unknown, unknown>();

  public register<T>(registration: Registration<T>): void {
    const token = registration.token;

    if (this._descriptors.has(token) && !registration.overwrite) {
      throw new DuplicateRegistrationError(
        `Duplicate service registration detected for token: ${this.getTokenName(token)}`,
        { token },
      );
    }

    let lifetime = ServiceLifetime.TRANSIENT;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let useClass: (new (...args: any[]) => T) | undefined;
    let dependencies: ServiceToken<unknown>[] | undefined;
    let useFactory: ((c: Container) => T) | undefined;
    let useValue: T | undefined;

    if ('useClass' in registration) {
      useClass = registration.useClass;
      dependencies = registration.dependencies;
      lifetime = registration.lifetime || ServiceLifetime.SINGLETON;
    } else if ('useFactory' in registration) {
      useFactory = registration.useFactory;
      lifetime = registration.lifetime || ServiceLifetime.SINGLETON;
    } else if ('useValue' in registration) {
      useValue = registration.useValue;
      lifetime = ServiceLifetime.SINGLETON;
    }

    this._descriptors.set(token, {
      token,
      lifetime,
      useClass,
      dependencies,
      useFactory,
      useValue,
    });

    this._singletons.delete(token);
  }

  public getDescriptor(token: unknown): ServiceDescriptor | undefined {
    return this._descriptors.get(token);
  }

  public hasDescriptor(token: unknown): boolean {
    return this._descriptors.has(token);
  }

  public getSingleton(token: unknown): unknown | undefined {
    return this._singletons.get(token);
  }

  public setSingleton(token: unknown, instance: unknown): void {
    this._singletons.set(token, instance);
  }

  public clear(): void {
    this._descriptors.clear();
    this._singletons.clear();
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
