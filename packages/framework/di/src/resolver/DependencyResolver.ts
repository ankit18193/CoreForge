import { CircularDependencyDetector } from './CircularDependencyDetector';
import { ConstructorResolver } from './ConstructorResolver';
import { PropertyResolver } from './PropertyResolver';
import { ResolutionContext } from '../context/ResolutionContext';
import { ScopeError } from '../errors/DependencyErrors';
import { DependencyProfiler } from '../internal/DependencyProfiler';
import { LifecycleHookExecutor } from '../lifecycle/LifecycleHookExecutor';
import { TokenFormatter } from '../provider/ProviderDescriptor';
import { ProviderFactory } from '../provider/ProviderFactory';
import { ProviderResolver } from '../provider/ProviderResolver';
import { ScopeManager } from '../scope/ScopeManager';
import { InjectionToken } from '../types/dependencyTypes';

export class DependencyResolver {
  private readonly _providerResolver: ProviderResolver;
  private readonly _scopeManager: ScopeManager;
  private readonly _hookExecutor: LifecycleHookExecutor;
  private readonly _constructorResolver: ConstructorResolver;
  private readonly _propertyResolver: PropertyResolver;

  constructor(
    providerResolver: ProviderResolver,
    scopeManager: ScopeManager,
    hookExecutor: LifecycleHookExecutor,
  ) {
    this._providerResolver = providerResolver;
    this._scopeManager = scopeManager;
    this._hookExecutor = hookExecutor;

    this._constructorResolver = new ConstructorResolver(this.resolveWithContext.bind(this));
    this._propertyResolver = new PropertyResolver(this.resolveWithContext.bind(this));
  }

  public async resolve<T>(
    token: InjectionToken<T>,
    context: ResolutionContext = new ResolutionContext(),
  ): Promise<T> {
    return this.resolveWithContext(token, context);
  }

  public async resolveWithContext<T>(
    token: InjectionToken<T>,
    context: ResolutionContext,
  ): Promise<T> {
    const profiler = new DependencyProfiler();
    profiler.start();

    const tokenName = TokenFormatter.format(token);

    try {
      const descriptor = this._providerResolver.resolveDescriptor(token);
      const scope = descriptor.scope || 'SINGLETON';

      // 1. Check Scope Cache
      if (scope === 'SINGLETON') {
        const cached = this._scopeManager.singletonScope.get<T>(token);
        if (cached !== undefined) {
          const duration = profiler.stop();
          if (context.diagnostics) {
            context.diagnostics.recordResolution(tokenName, duration, true, scope);
          }
          return cached;
        }
      } else if (scope === 'REQUEST') {
        if (!context.requestScope) {
          throw new ScopeError(
            `Cannot resolve request-scoped provider for token "${tokenName}" outside of an active RequestScope.`,
            { token: tokenName },
          );
        }

        const cached = context.requestScope.get<T>(token);
        if (cached !== undefined) {
          const duration = profiler.stop();
          if (context.diagnostics) {
            context.diagnostics.recordResolution(tokenName, duration, true, scope);
          }
          return cached;
        }
      }

      // 2. Circular Dependency Detection
      CircularDependencyDetector.checkCycle(context.stack, token);

      // 3. Push to ResolutionStack
      context.stack.push(token);

      try {
        // 4. Resolve constructor dependencies recursively
        const resolvedArgs = await this._constructorResolver.resolveDependencies(
          descriptor.dependencies,
          context,
        );

        // 5. Construct / create instance
        const instance = await ProviderFactory.createInstance<T>(descriptor, resolvedArgs);

        // 6. Resolve and apply property injections
        await this._propertyResolver.injectProperties(
          instance,
          descriptor.propertyInjections,
          context,
        );

        // 7. Execute onInit lifecycle hook
        await this._hookExecutor.executeOnInit(instance, tokenName, context.diagnostics);

        // 8. Cache instance in appropriate scope
        if (scope === 'SINGLETON') {
          this._scopeManager.singletonScope.set(token, instance);
        } else if (scope === 'REQUEST') {
          context.requestScope?.set(token, instance);
        }

        const duration = profiler.stop();
        if (context.diagnostics) {
          context.diagnostics.recordResolution(tokenName, duration, false, scope);
        }

        return instance;
      } finally {
        context.stack.pop();
      }
    } catch (err) {
      profiler.stop();
      if (context.diagnostics) {
        if (
          err &&
          typeof err === 'object' &&
          'code' in err &&
          err.code === 'CF-DI-CIRCULAR_DEPENDENCY'
        ) {
          context.diagnostics.recordCircularDependencyFailure();
        } else {
          context.diagnostics.recordResolutionFailure();
        }
      }
      throw err;
    }
  }
}
