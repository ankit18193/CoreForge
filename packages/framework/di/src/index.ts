export { Container } from './container/Container';
export { ContainerBuilder } from './container/ContainerBuilder';
export { ContainerConfiguration } from './container/ContainerConfiguration';
export type { ContainerOptions } from './container/ContainerOptions';

export { DependencyResolver } from './resolver/DependencyResolver';
export { ConstructorResolver } from './resolver/ConstructorResolver';
export { PropertyResolver } from './resolver/PropertyResolver';
export { DependencyGraph } from './resolver/DependencyGraph';
export { CircularDependencyDetector } from './resolver/CircularDependencyDetector';

export { ProviderRegistry } from './provider/ProviderRegistry';
export { ProviderDescriptorHelper, TokenFormatter } from './provider/ProviderDescriptor';
export { ProviderFactory } from './provider/ProviderFactory';
export { ProviderResolver } from './provider/ProviderResolver';

export { ScopeManager } from './scope/ScopeManager';
export { RequestScope } from './scope/RequestScope';
export { SingletonScope } from './scope/SingletonScope';
export { TransientScope } from './scope/TransientScope';

export { DependencyLifecycleManager } from './lifecycle/DependencyLifecycleManager';
export { LifecycleHookExecutor } from './lifecycle/LifecycleHookExecutor';
export { DependencyState } from './lifecycle/DependencyState';

export { ResolutionContext } from './context/ResolutionContext';
export { ResolutionStack } from './context/ResolutionStack';

export { DependencyDiagnostics } from './diagnostics/DependencyDiagnostics';

export {
  DependencyError,
  ProviderRegistrationError,
  DuplicateProviderError,
  ProviderNotFoundError,
  CircularDependencyError,
  DependencyResolutionError,
  ScopeError,
  ContainerStateError,
  LifecycleHookError,
} from './errors/DependencyErrors';

export type {
  AbstractConstructor,
  ClassProviderOptions,
  Constructor,
  DependencyContainer,
  DiagnosticsSnapshot,
  Factory,
  FactoryProviderOptions,
  InjectionToken,
  OnDestroy,
  OnInit,
  PropertyInjection,
  ProviderDescriptor,
  ProviderScope,
  ValueProviderOptions,
} from './types/dependencyTypes';
