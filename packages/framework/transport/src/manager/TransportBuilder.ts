import { TransportAdapter, TransportAdapterOptions } from '@coreforge/contracts';
import { ExecutionContextManager } from '@coreforge/execution-context';
import { ApplicationIntegration } from '@coreforge/integration';

import { TransportManager } from './TransportManager';

interface RegisteredAdapterConfig {
  readonly adapter: TransportAdapter<unknown, unknown>;
  readonly options?: TransportAdapterOptions | undefined;
}

export class TransportBuilder {
  private readonly _application?: ApplicationIntegration | undefined;
  private readonly _contextManager?: ExecutionContextManager | undefined;
  private readonly _defaultTimeoutMs?: number | undefined;
  private readonly _autoStart?: boolean | undefined;
  private readonly _adapters: readonly RegisteredAdapterConfig[];

  private constructor(
    adapters: readonly RegisteredAdapterConfig[] = [],
    application?: ApplicationIntegration,
    contextManager?: ExecutionContextManager,
    defaultTimeoutMs?: number,
    autoStart?: boolean,
  ) {
    this._adapters = adapters;
    this._application = application;
    this._contextManager = contextManager;
    this._defaultTimeoutMs = defaultTimeoutMs;
    this._autoStart = autoStart;
  }

  public static create(): TransportBuilder {
    return new TransportBuilder();
  }

  public withApplication(application: ApplicationIntegration): TransportBuilder {
    return new TransportBuilder(
      this._adapters,
      application,
      this._contextManager,
      this._defaultTimeoutMs,
      this._autoStart,
    );
  }

  public withContextManager(contextManager: ExecutionContextManager): TransportBuilder {
    return new TransportBuilder(
      this._adapters,
      this._application,
      contextManager,
      this._defaultTimeoutMs,
      this._autoStart,
    );
  }

  public withDefaultTimeout(timeoutMs: number): TransportBuilder {
    return new TransportBuilder(
      this._adapters,
      this._application,
      this._contextManager,
      timeoutMs,
      this._autoStart,
    );
  }

  public withAutoStart(autoStart = true): TransportBuilder {
    return new TransportBuilder(
      this._adapters,
      this._application,
      this._contextManager,
      this._defaultTimeoutMs,
      autoStart,
    );
  }

  public registerAdapter<TRequest = unknown, TResponse = unknown>(
    adapter: TransportAdapter<TRequest, TResponse>,
    options?: TransportAdapterOptions,
  ): TransportBuilder {
    const nextAdapters = [
      ...this._adapters,
      { adapter: adapter as TransportAdapter<unknown, unknown>, options },
    ];
    return new TransportBuilder(
      nextAdapters,
      this._application,
      this._contextManager,
      this._defaultTimeoutMs,
      this._autoStart,
    );
  }

  public build(): TransportManager {
    const manager = new TransportManager({
      application: this._application,
      contextManager: this._contextManager,
      defaultTimeoutMs: this._defaultTimeoutMs,
      autoStart: false,
    });

    for (const entry of this._adapters) {
      manager.registerAdapter(entry.adapter, entry.options);
    }

    if (this._autoStart) {
      manager.startSync();
    }

    return manager;
  }
}
