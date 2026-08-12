import { EventBus, RequestScope as IRequestScope } from '@coreforge/contracts';

import { ScopeDisposer } from '../cleanup/ScopeDisposer';
import { ScopedContainer } from '../container/ScopedContainer';
import { ScopeDiagnostics } from '../diagnostics/ScopeDiagnostics';
import { ScopeExecutionError } from '../errors/ScopeErrors';
import { ScopeLifecycleManager } from '../lifecycle/ScopeLifecycleManager';
import { ScopeState } from '../lifecycle/ScopeState';
import { ScopeMetadata } from '../metadata/ScopeMetadata';

export class RequestScope implements IRequestScope {
  public readonly id: string;
  public readonly metadata: ScopeMetadata;

  private readonly _container: ScopedContainer;
  private readonly _lifecycle = new ScopeLifecycleManager();
  private readonly _disposer: ScopeDisposer;
  private readonly _eventBus: EventBus;
  private readonly _diagnostics: ScopeDiagnostics;
  private readonly _disposers: readonly ((scope: RequestScope) => Promise<void> | void)[];

  private readonly _createdAt: number;

  constructor(params: {
    id: string;
    metadata: ScopeMetadata;
    container: ScopedContainer;
    disposer: ScopeDisposer;
    eventBus: EventBus;
    diagnostics: ScopeDiagnostics;
    disposers: readonly ((scope: RequestScope) => Promise<void> | void)[];
  }) {
    this.id = params.id;
    this.metadata = params.metadata;
    this._container = params.container;
    this._disposer = params.disposer;
    this._eventBus = params.eventBus;
    this._diagnostics = params.diagnostics;
    this._disposers = params.disposers;
    this._createdAt = Date.now();

    this._lifecycle.transitionTo(ScopeState.ACTIVE);
  }

  public get state(): ScopeState {
    return this._lifecycle.state;
  }

  public get container(): ScopedContainer {
    return this._container;
  }

  public resolve<T>(token: unknown): T {
    if (
      this._lifecycle.state === ScopeState.DISPOSED ||
      this._lifecycle.state === ScopeState.DISPOSING
    ) {
      throw new ScopeExecutionError(
        'Cannot resolve services from a disposed or disposing request scope.',
      );
    }

    const start = Date.now();
    try {
      const instance = this._container.resolve<T>(token);
      this._diagnostics.recordResolve(Date.now() - start);
      return instance;
    } catch (err: unknown) {
      this._lifecycle.transitionTo(ScopeState.FAILED);
      this._eventBus
        .publish({
          type: 'ScopeFailedEvent',
          scopeId: this.id,
          error: err instanceof Error ? err.message : String(err),
        })
        .catch(() => {});
      throw err;
    }
  }

  public async dispose(): Promise<void> {
    if (
      this._lifecycle.state === ScopeState.DISPOSED ||
      this._lifecycle.state === ScopeState.DISPOSING
    ) {
      return;
    }

    this._lifecycle.transitionTo(ScopeState.DISPOSING);
    const start = Date.now();

    try {
      for (const fn of this._disposers) {
        await fn(this);
      }

      const instances = this._container.cache.getInstancesInCreationOrder();
      await this._disposer.dispose([...instances]);

      this._lifecycle.transitionTo(ScopeState.DISPOSED);
      this._diagnostics.recordScopeDisposal(
        true,
        Date.now() - start,
        Date.now() - this._createdAt,
      );

      await this._eventBus.publish({
        type: 'ScopeDisposedEvent',
        scopeId: this.id,
      });
    } catch (err: unknown) {
      this._lifecycle.transitionTo(ScopeState.FAILED);
      this._diagnostics.recordScopeDisposal(
        false,
        Date.now() - start,
        Date.now() - this._createdAt,
      );

      await this._eventBus
        .publish({
          type: 'ScopeFailedEvent',
          scopeId: this.id,
          error: err instanceof Error ? err.message : String(err),
        })
        .catch(() => {});

      throw err;
    }
  }
}
