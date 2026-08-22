import { RequestScope as IRequestScope } from '@coreforge/contracts';

import { ScopedInstanceEntry } from './SingletonScope';
import { ScopeError } from '../errors/DependencyErrors';
import { LifecycleHookExecutor } from '../lifecycle/LifecycleHookExecutor';
import { TokenFormatter } from '../provider/ProviderDescriptor';
import { InjectionToken } from '../types/dependencyTypes';

export type ScopeResolveDelegate = <T>(token: InjectionToken<T>, scope: RequestScope) => Promise<T>;

export class RequestScope implements IRequestScope {
  public readonly id: string;
  private readonly _instances = new Map<
    string | symbol,
    { token: InjectionToken; tokenName: string; instance: unknown }
  >();
  private readonly _resolveDelegate: ScopeResolveDelegate;
  private readonly _hookExecutor: LifecycleHookExecutor;
  private _disposed = false;

  constructor(
    id: string,
    resolveDelegate: ScopeResolveDelegate,
    hookExecutor: LifecycleHookExecutor,
  ) {
    this.id = id;
    this._resolveDelegate = resolveDelegate;
    this._hookExecutor = hookExecutor;
  }

  public get isDisposed(): boolean {
    return this._disposed;
  }

  public get<T>(token: InjectionToken): T | undefined {
    this.assertNotDisposed();
    const key = TokenFormatter.toKey(token);
    const entry = this._instances.get(key);
    return entry ? (entry.instance as T) : undefined;
  }

  public set<T>(token: InjectionToken, instance: T): void {
    this.assertNotDisposed();
    const key = TokenFormatter.toKey(token);
    const tokenName = TokenFormatter.format(token);
    this._instances.set(key, { token, tokenName, instance });
  }

  public has(token: InjectionToken): boolean {
    this.assertNotDisposed();
    const key = TokenFormatter.toKey(token);
    return this._instances.has(key);
  }

  public async resolve<T>(token: InjectionToken<T>): Promise<T> {
    this.assertNotDisposed();
    return this._resolveDelegate(token, this);
  }

  public async dispose(): Promise<void> {
    if (this._disposed) {
      return;
    }

    this._disposed = true;

    // Execute onDestroy in reverse resolution order
    const entries = Array.from(this._instances.values()).reverse();
    for (const entry of entries) {
      await this._hookExecutor.executeOnDestroy(entry.instance, entry.tokenName);
    }

    this._instances.clear();
  }

  public getAllEntries(): readonly ScopedInstanceEntry[] {
    return Object.freeze(Array.from(this._instances.values()));
  }

  private assertNotDisposed(): void {
    if (this._disposed) {
      throw new ScopeError(
        `Cannot access request scope "${this.id}": the scope has already been disposed.`,
        { scopeId: this.id },
      );
    }
  }
}
