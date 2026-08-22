import { RequestScope, ScopeResolveDelegate } from './RequestScope';
import { SingletonScope } from './SingletonScope';
import { TransientScope } from './TransientScope';
import { LifecycleHookExecutor } from '../lifecycle/LifecycleHookExecutor';

export class ScopeManager {
  private readonly _singletonScope = new SingletonScope();
  private readonly _transientScope = new TransientScope();
  private readonly _activeRequestScopes = new Map<string, RequestScope>();
  private readonly _hookExecutor: LifecycleHookExecutor;
  private _scopeCounter = 0;

  constructor(hookExecutor: LifecycleHookExecutor) {
    this._hookExecutor = hookExecutor;
  }

  public get singletonScope(): SingletonScope {
    return this._singletonScope;
  }

  public get transientScope(): TransientScope {
    return this._transientScope;
  }

  public createRequestScope(resolveDelegate: ScopeResolveDelegate): RequestScope {
    this._scopeCounter++;
    const scopeId = `request-scope-${this._scopeCounter}-${Date.now()}`;
    const scope = new RequestScope(scopeId, resolveDelegate, this._hookExecutor);
    this._activeRequestScopes.set(scopeId, scope);
    return scope;
  }

  public async disposeAll(): Promise<void> {
    const scopes = Array.from(this._activeRequestScopes.values());
    for (const s of scopes) {
      await s.dispose();
    }
    this._activeRequestScopes.clear();

    // Dispose singletons
    const singletonEntries = [...this._singletonScope.getAllEntries()].reverse();
    for (const entry of singletonEntries) {
      await this._hookExecutor.executeOnDestroy(entry.instance, entry.tokenName);
    }
    this._singletonScope.clear();
  }

  public get activeScopeCount(): number {
    return this._activeRequestScopes.size;
  }
}
