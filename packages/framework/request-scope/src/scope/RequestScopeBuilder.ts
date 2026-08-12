import { Container } from '@coreforge/contracts';

import { RequestScope } from './RequestScope';
import { RequestScopeConfiguration } from './RequestScopeConfiguration';
import { ScopeRegistry } from '../container/ScopeRegistry';
import { ScopeDiagnostics } from '../diagnostics/ScopeDiagnostics';
import { ScopeConfigurationError } from '../errors/ScopeErrors';

export class RequestScopeBuilder {
  private _rootContainer?: Container | undefined;
  private readonly _diagnostics = new ScopeDiagnostics();
  private readonly _registry = new ScopeRegistry();
  private _disposalTimeoutMs?: number | undefined;

  private readonly _initializers: ((scope: RequestScope) => Promise<void> | void)[] = [];
  private readonly _disposers: ((scope: RequestScope) => Promise<void> | void)[] = [];

  public setRootContainer(container: Container): this {
    this._rootContainer = container;
    return this;
  }

  public setDisposalTimeoutMs(timeoutMs: number): this {
    this._disposalTimeoutMs = timeoutMs;
    return this;
  }

  public registerScopedInitializer(initializer: (scope: RequestScope) => Promise<void> | void): this {
    this._initializers.push(initializer);
    return this;
  }

  public registerScopedDisposer(disposer: (scope: RequestScope) => Promise<void> | void): this {
    this._disposers.push(disposer);
    return this;
  }

  public get initializers(): readonly ((scope: RequestScope) => Promise<void> | void)[] {
    return this._initializers;
  }

  public get disposers(): readonly ((scope: RequestScope) => Promise<void> | void)[] {
    return this._disposers;
  }

  public get diagnostics(): ScopeDiagnostics {
    return this._diagnostics;
  }

  public get registry(): ScopeRegistry {
    return this._registry;
  }

  public build(): RequestScopeConfiguration {
    if (!this._rootContainer) {
      throw new ScopeConfigurationError('Root container is required for RequestScope.');
    }

    return new RequestScopeConfiguration({
      rootContainer: this._rootContainer,
      diagnostics: this._diagnostics,
      registry: this._registry,
      disposalTimeoutMs: this._disposalTimeoutMs,
    });
  }
}
