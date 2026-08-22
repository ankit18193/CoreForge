import { ContainerConfiguration } from './ContainerConfiguration';
import { ContainerOptions } from './ContainerOptions';
import { ResolutionContext } from '../context/ResolutionContext';
import { DependencyDiagnostics } from '../diagnostics/DependencyDiagnostics';
import { DependencyLifecycleManager } from '../lifecycle/DependencyLifecycleManager';
import { DependencyState } from '../lifecycle/DependencyState';
import { LifecycleHookExecutor } from '../lifecycle/LifecycleHookExecutor';
import { ProviderDescriptorHelper, TokenFormatter } from '../provider/ProviderDescriptor';
import { ProviderRegistry } from '../provider/ProviderRegistry';
import { ProviderResolver } from '../provider/ProviderResolver';
import { DependencyResolver } from '../resolver/DependencyResolver';
import { RequestScope } from '../scope/RequestScope';
import { ScopeManager } from '../scope/ScopeManager';
import {
  Constructor,
  DependencyContainer,
  DiagnosticsSnapshot,
  Factory,
  InjectionToken,
  PropertyInjection,
  ProviderDescriptor,
  ProviderScope,
} from '../types/dependencyTypes';

export class Container implements DependencyContainer {
  private readonly _config: ContainerConfiguration;
  private readonly _lifecycle = new DependencyLifecycleManager();
  private readonly _diagnostics = new DependencyDiagnostics();
  private readonly _registry: ProviderRegistry;
  private readonly _hookExecutor = new LifecycleHookExecutor();
  private readonly _scopeManager: ScopeManager;
  private readonly _resolver: DependencyResolver;

  constructor(options: ContainerOptions = {}) {
    this._config = new ContainerConfiguration(options);
    this._registry = new ProviderRegistry(this._config.allowOverride);
    this._scopeManager = new ScopeManager(this._hookExecutor);

    const providerResolver = new ProviderResolver(this._registry);
    this._resolver = new DependencyResolver(
      providerResolver,
      this._scopeManager,
      this._hookExecutor,
    );
  }

  public get config(): ContainerConfiguration {
    return this._config;
  }

  public get state(): DependencyState {
    return this._lifecycle.state;
  }

  public get diagnostics(): DiagnosticsSnapshot {
    return this._diagnostics.snapshot();
  }

  public register<T>(provider: ProviderDescriptor<T>): void {
    this._lifecycle.assertCanRegister();
    this._registry.register(provider);
    if (this._config.enableDiagnostics) {
      this._diagnostics.recordProviderRegistration();
    }
  }

  public registerClass<T>(
    token: InjectionToken<T>,
    useClass: Constructor<T>,
    scope: ProviderScope = 'SINGLETON',
    dependencies?: readonly InjectionToken[],
    propertyInjections?: readonly PropertyInjection[],
  ): void {
    const desc = ProviderDescriptorHelper.createClassProvider(
      token,
      useClass,
      scope,
      dependencies,
      propertyInjections,
    );
    this.register(desc);
  }

  public registerValue<T>(
    token: InjectionToken<T>,
    useValue: T,
    scope: ProviderScope = 'SINGLETON',
  ): void {
    const desc = ProviderDescriptorHelper.createValueProvider(token, useValue, scope);
    this.register(desc);
  }

  public registerFactory<T>(
    token: InjectionToken<T>,
    useFactory: Factory<T>,
    dependencies?: readonly InjectionToken[],
    scope: ProviderScope = 'SINGLETON',
  ): void {
    const desc = ProviderDescriptorHelper.createFactoryProvider(
      token,
      useFactory,
      dependencies,
      scope,
    );
    this.register(desc);
  }

  public has(token: InjectionToken): boolean {
    return this._registry.has(token);
  }

  public makeReady(): void {
    this._lifecycle.transitionTo(DependencyState.READY);
  }

  public async start(): Promise<void> {
    if (
      this._lifecycle.state === DependencyState.CREATED ||
      this._lifecycle.state === DependencyState.REGISTERING
    ) {
      this._lifecycle.transitionTo(DependencyState.READY);
    }
    this._lifecycle.transitionTo(DependencyState.RUNNING);
  }

  public async resolve<T>(token: InjectionToken<T>): Promise<T> {
    this._lifecycle.assertCanResolve();
    const context = new ResolutionContext(
      undefined,
      this._config.enableDiagnostics ? this._diagnostics : undefined,
    );
    return this._resolver.resolve(token, context);
  }

  public createScope(): RequestScope {
    this._lifecycle.assertCanResolve();
    return this._scopeManager.createRequestScope(
      async <T>(token: InjectionToken<T>, scope: RequestScope) => {
        this._lifecycle.assertCanResolve();
        const context = new ResolutionContext(
          scope,
          this._config.enableDiagnostics ? this._diagnostics : undefined,
        );
        return this._resolver.resolve(token, context);
      },
    );
  }

  public async stop(): Promise<void> {
    if (this._lifecycle.state === DependencyState.STOPPED) {
      return;
    }

    this._lifecycle.transitionTo(DependencyState.STOPPING);
    await this._scopeManager.disposeAll();
    this._lifecycle.transitionTo(DependencyState.STOPPED);
  }

  public formatToken(token: InjectionToken): string {
    return TokenFormatter.format(token);
  }
}
