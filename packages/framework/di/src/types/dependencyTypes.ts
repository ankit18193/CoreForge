import {
  AbstractConstructor,
  Constructor,
  DependencyContainer,
  InjectionToken,
  PropertyInjection,
  ProviderDescriptor,
  ProviderScope,
} from '@coreforge/contracts';

export type {
  AbstractConstructor,
  Constructor,
  DependencyContainer,
  InjectionToken,
  PropertyInjection,
  ProviderDescriptor,
  ProviderScope,
};

export interface OnInit {
  onInit(): Promise<void> | void;
}

export interface OnDestroy {
  onDestroy(): Promise<void> | void;
}

export type Factory<T = unknown> = (...args: unknown[]) => T | Promise<T>;

export interface ClassProviderOptions<T = unknown> {
  readonly scope?: ProviderScope | undefined;
  readonly dependencies?: readonly InjectionToken[] | undefined;
  readonly propertyInjections?: readonly PropertyInjection[] | undefined;
  readonly useClass: Constructor<T>;
}

export interface ValueProviderOptions<T = unknown> {
  readonly scope?: ProviderScope | undefined;
  readonly useValue: T;
}

export interface FactoryProviderOptions<T = unknown> {
  readonly scope?: ProviderScope | undefined;
  readonly dependencies?: readonly InjectionToken[] | undefined;
  readonly useFactory: Factory<T>;
}

export interface DiagnosticsSnapshot {
  readonly providerCount: number;
  readonly resolutionCount: number;
  readonly cacheHits: number;
  readonly cacheMisses: number;
  readonly singletonCount: number;
  readonly requestScopedCount: number;
  readonly transientCount: number;
  readonly resolutionFailures: number;
  readonly circularDependencyFailures: number;
  readonly averageResolutionDurationMs: number;
  readonly slowestResolutionDurationMs: number;
  readonly slowestToken?: string | undefined;
  readonly totalLifecycleHookDurationMs: number;
  readonly timestamp: number;
}
