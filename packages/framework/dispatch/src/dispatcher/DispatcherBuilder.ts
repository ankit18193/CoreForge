import { ExecutionEngine } from '@coreforge/execution';
import { ExecutionContextManager } from '@coreforge/execution-context';
import { InterceptorEngine } from '@coreforge/interceptors';

import { Dispatcher } from './Dispatcher';
import { CommandHandler } from '../types/dispatchTypes';

interface BuilderHandlerEntry {
  readonly type: string;
  readonly handler: CommandHandler<unknown, unknown>;
}

export class DispatcherBuilder {
  private _contextManager?: ExecutionContextManager | undefined;
  private _executionEngine?: ExecutionEngine | undefined;
  private _interceptorEngine?: InterceptorEngine | undefined;
  private readonly _handlers: BuilderHandlerEntry[] = [];
  private _autoStart = false;

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
    handler: CommandHandler<TPayload, TResult>,
  ): this {
    this._handlers.push({
      type,
      handler: handler as CommandHandler<unknown, unknown>,
    });
    return this;
  }

  public withAutoStart(autoStart: boolean): this {
    this._autoStart = autoStart;
    return this;
  }

  public build(): Dispatcher {
    const dispatcher = new Dispatcher({
      contextManager: this._contextManager,
      executionEngine: this._executionEngine,
      interceptorEngine: this._interceptorEngine,
      autoStart: false,
    });

    for (const entry of this._handlers) {
      dispatcher.register(entry.type, entry.handler);
    }

    if (this._autoStart) {
      dispatcher.startSync();
    }

    return dispatcher;
  }
}
