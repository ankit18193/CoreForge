import { ExecutionEngine } from '@coreforge/execution';
import { ExecutionContextManager } from '@coreforge/execution-context';
import { InterceptorEngine } from '@coreforge/interceptors';

import { QueryBus } from './QueryBus';
import { QueryHandler } from '../types/queryTypes';

interface BuilderHandlerEntry {
  readonly type: string;
  readonly handler: QueryHandler<unknown, unknown>;
}

export class QueryBuilder {
  private _contextManager?: ExecutionContextManager | undefined;
  private _executionEngine?: ExecutionEngine | undefined;
  private _interceptorEngine?: InterceptorEngine | undefined;
  private readonly _handlers: BuilderHandlerEntry[] = [];
  private _autoStart = false;

  public static create(): QueryBuilder {
    return new QueryBuilder();
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

  public withHandler<TPayload, TResult>(
    type: string,
    handler: QueryHandler<TPayload, TResult>,
  ): this {
    this._handlers.push({
      type,
      handler: handler as QueryHandler<unknown, unknown>,
    });
    return this;
  }

  public withAutoStart(autoStart: boolean): this {
    this._autoStart = autoStart;
    return this;
  }

  public build(): QueryBus {
    const bus = new QueryBus({
      contextManager: this._contextManager,
      executionEngine: this._executionEngine,
      interceptorEngine: this._interceptorEngine,
      autoStart: false,
    });

    for (const entry of this._handlers) {
      bus.register(entry.type, entry.handler);
    }

    if (this._autoStart) {
      bus.startSync();
    }

    return bus;
  }
}
