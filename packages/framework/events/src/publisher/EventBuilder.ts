import { ExecutionEngine } from '@coreforge/execution';
import { ExecutionContextManager } from '@coreforge/execution-context';
import { InterceptorEngine } from '@coreforge/interceptors';

import { EventPublisher } from './EventPublisher';
import {
  EventExecutionMode,
  EventFailureStrategy,
  EventHandler,
  EventHandlerOptions,
} from '../types/eventTypes';

interface BuilderHandlerEntry {
  readonly type: string;
  readonly handler: EventHandler<unknown>;
  readonly options?: EventHandlerOptions | undefined;
}

export class EventBuilder {
  private _contextManager?: ExecutionContextManager | undefined;
  private _executionEngine?: ExecutionEngine | undefined;
  private _interceptorEngine?: InterceptorEngine | undefined;
  private _defaultMode?: EventExecutionMode | undefined;
  private _defaultFailureStrategy?: EventFailureStrategy | undefined;
  private readonly _handlers: BuilderHandlerEntry[] = [];
  private _autoStart = false;

  public static create(): EventBuilder {
    return new EventBuilder();
  }

  public withContextManager(manager: ExecutionContextManager): this {
    this._contextManager = manager;
    return this;
  }

  public withExecutionEngine(engine: ExecutionEngine): this {
    this._executionEngine = engine;
    return this;
  }

  public withInterceptorEngine(engine: InterceptorEngine): this {
    this._interceptorEngine = engine;
    return this;
  }

  public withDefaultMode(mode: EventExecutionMode): this {
    this._defaultMode = mode;
    return this;
  }

  public withDefaultFailureStrategy(strategy: EventFailureStrategy): this {
    this._defaultFailureStrategy = strategy;
    return this;
  }

  public withHandler<TPayload>(
    type: string,
    handler: EventHandler<TPayload>,
    options?: EventHandlerOptions,
  ): this {
    this._handlers.push({
      type,
      handler: handler as EventHandler<unknown>,
      options,
    });
    return this;
  }

  public withAutoStart(autoStart: boolean): this {
    this._autoStart = autoStart;
    return this;
  }

  public build(): EventPublisher {
    const publisher = new EventPublisher({
      contextManager: this._contextManager,
      executionEngine: this._executionEngine,
      interceptorEngine: this._interceptorEngine,
      defaultMode: this._defaultMode,
      defaultFailureStrategy: this._defaultFailureStrategy,
      autoStart: false,
    });

    for (const entry of this._handlers) {
      publisher.register(entry.type, entry.handler, entry.options);
    }

    if (this._autoStart) {
      publisher.startSync();
    }

    return publisher;
  }
}
