import { RouteDefinition, RouteMatch, RouteMethod, Router as IRouter } from '@coreforge/contracts';

import { RouterConfiguration } from './RouterConfiguration';
import { RouteState } from './RouteState';
import { RouterDiagnostics, RouterDiagnosticsSnapshot } from '../diagnostics/RouterDiagnostics';
import { RouterStateError } from '../errors/RouterErrors';
import { RouteNormalizer } from '../internal/RouteNormalizer';
import { RouterLifecycleManager } from '../lifecycle/RouterLifecycleManager';
import { RouteRegistry } from '../registry/RouteRegistry';
import { ResolutionContext } from '../resolver/ResolutionContext';
import { RouteResolver } from '../resolver/RouteResolver';

export class Router implements IRouter {
  private readonly _configuration: RouterConfiguration;
  private readonly _registry = new RouteRegistry();
  private readonly _resolver: RouteResolver;
  private readonly _lifecycleManager = new RouterLifecycleManager();
  private readonly _diagnostics = new RouterDiagnostics();

  constructor(configuration: RouterConfiguration) {
    this._configuration = configuration;
    this._resolver = new RouteResolver(this._registry);
  }

  public get state(): RouteState {
    return this._lifecycleManager.state;
  }

  public get diagnostics(): RouterDiagnosticsSnapshot {
    return this._diagnostics.getSnapshot();
  }

  public ready(): void {
    if (this._lifecycleManager.state === RouteState.REGISTERING) {
      this._lifecycleManager.transitionTo(RouteState.READY);
    } else if (this._lifecycleManager.state === RouteState.CREATED) {
      this._lifecycleManager.transitionTo(RouteState.REGISTERING);
      this._lifecycleManager.transitionTo(RouteState.READY);
    }
  }

  public stop(): void {
    if (this._lifecycleManager.state === RouteState.READY) {
      this._lifecycleManager.transitionTo(RouteState.STOPPING);
      this._lifecycleManager.transitionTo(RouteState.STOPPED);
    }
  }

  public register(route: RouteDefinition): void {
    if (
      this._lifecycleManager.state === RouteState.READY ||
      this._lifecycleManager.state === RouteState.STOPPED ||
      this._lifecycleManager.state === RouteState.STOPPING
    ) {
      throw new RouterStateError(
        'Cannot register new routes once the Router is in READY or STOPPED states.',
      );
    }

    if (this._lifecycleManager.state === RouteState.CREATED) {
      this._lifecycleManager.transitionTo(RouteState.REGISTERING);
    }

    const compileStart = Date.now();
    const normalized = RouteNormalizer.normalize(route.path, this._configuration.caseSensitive);
    const { pattern, parameterNames } = RouteRegistry.compilePattern(
      route.path,
      this._configuration.caseSensitive,
    );

    const id = `route-${route.method}-${normalized}`;

    this._registry.register({
      id,
      method: route.method,
      originalPath: route.path,
      normalizedPath: normalized,
      pattern,
      parameterNames,
      createdAt: Date.now(),
    });

    const elapsed = Date.now() - compileStart;
    this._diagnostics.addCompilationTime(elapsed);

    const hasWildcard = pattern.segments.some((s) => s.type === 'WILDCARD');
    const hasParams = pattern.segments.some((s) => s.type === 'PARAMETER');
    const type = hasWildcard ? 'WILDCARD' : hasParams ? 'PARAMETER' : 'STATIC';
    this._diagnostics.recordRouteAdded(type);
  }

  public resolve(method: RouteMethod, path: string): RouteMatch | undefined {
    if (
      this._lifecycleManager.state === RouteState.STOPPED ||
      this._lifecycleManager.state === RouteState.STOPPING
    ) {
      throw new RouterStateError('Cannot resolve routes when Router is stopped.');
    }

    if (
      this._lifecycleManager.state === RouteState.REGISTERING ||
      this._lifecycleManager.state === RouteState.CREATED
    ) {
      this.ready();
    }

    const context = new ResolutionContext(method, path);
    const match = this._resolver.resolve(method, path, context);

    this._diagnostics.recordLookup(context.duration || 0);
    return match || undefined;
  }
}
