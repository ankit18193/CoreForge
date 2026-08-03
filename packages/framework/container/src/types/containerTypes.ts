import { Container } from '@coreforge/contracts';

import { ServiceLifetime } from '../lifetimes/ServiceLifetime';
import { ServiceToken } from '../tokens/InjectionToken';

export interface ClassRegistration<T> {
  token: ServiceToken<T>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useClass: new (...args: any[]) => T;
  dependencies?: ServiceToken<unknown>[] | undefined;
  lifetime?: ServiceLifetime | undefined;
  overwrite?: boolean | undefined;
}

export interface FactoryRegistration<T> {
  token: ServiceToken<T>;
  useFactory: (container: Container) => T;
  lifetime?: ServiceLifetime | undefined;
  overwrite?: boolean | undefined;
}

export interface ValueRegistration<T> {
  token: ServiceToken<T>;
  useValue: T;
  overwrite?: boolean | undefined;
}

export type Registration<T> = ClassRegistration<T> | FactoryRegistration<T> | ValueRegistration<T>;

export interface ServiceDescriptor<T = unknown> {
  token: ServiceToken<T>;
  lifetime: ServiceLifetime;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useClass?: (new (...args: any[]) => T) | undefined;
  dependencies?: ServiceToken<unknown>[] | undefined;
  useFactory?: ((container: Container) => T) | undefined;
  useValue?: T | undefined;
}
