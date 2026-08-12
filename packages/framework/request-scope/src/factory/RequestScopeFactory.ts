import { EventBus } from '@coreforge/contracts';

import { ScopeDisposer } from '../cleanup/ScopeDisposer';
import { ScopedContainer } from '../container/ScopedContainer';
import { ScopeDescriptor } from '../container/ScopeDescriptor';
import { ScopeMetadata } from '../metadata/ScopeMetadata';
import { RequestScope } from '../scope/RequestScope';
import { RequestScopeConfiguration } from '../scope/RequestScopeConfiguration';

export class RequestScopeFactory {
  private readonly _config: RequestScopeConfiguration;
  private readonly _eventBus: EventBus;
  private readonly _initializers: readonly ((scope: RequestScope) => Promise<void> | void)[];
  private readonly _disposers: readonly ((scope: RequestScope) => Promise<void> | void)[];

  private _counter = 0;

  constructor(
    config: RequestScopeConfiguration,
    eventBus: EventBus,
    initializers: readonly ((scope: RequestScope) => Promise<void> | void)[] = [],
    disposers: readonly ((scope: RequestScope) => Promise<void> | void)[] = [],
  ) {
    this._config = config;
    this._eventBus = eventBus;
    this._initializers = initializers;
    this._disposers = disposers;
  }

  public async createScope(requestId?: string, owner?: string): Promise<RequestScope> {
    const scopeId = `scope-${++this._counter}-${Date.now()}`;

    const metaParams: { scopeId: string; requestId?: string; owner?: string } = { scopeId };
    if (requestId !== undefined) {
      metaParams.requestId = requestId;
    }
    if (owner !== undefined) {
      metaParams.owner = owner;
    }

    const metadata = new ScopeMetadata(metaParams);
    const container = new ScopedContainer(this._config.rootContainer);
    const disposer = new ScopeDisposer(this._config.disposalTimeoutMs);

    const internalDisposers: ((scope: RequestScope) => Promise<void> | void)[] = [
      async () => {
        this._config.registry.unregister(scopeId);
      },
      ...this._disposers,
    ];

    const scope = new RequestScope({
      id: scopeId,
      metadata,
      container,
      disposer,
      eventBus: this._eventBus,
      diagnostics: this._config.diagnostics,
      disposers: internalDisposers,
    });

    const descriptor: ScopeDescriptor = {
      id: scopeId,
      scope,
      metadata,
    };

    this._config.registry.register(descriptor);
    this._config.diagnostics.recordScopeCreation();

    await this._eventBus.publish({
      type: 'ScopeCreatedEvent',
      scopeId,
      requestId,
    });

    for (const fn of this._initializers) {
      await fn(scope);
    }

    return scope;
  }
}
