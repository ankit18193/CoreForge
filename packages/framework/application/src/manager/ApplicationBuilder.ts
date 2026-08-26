import { Dispatcher } from '@coreforge/dispatch';
import { ExecutionEngine } from '@coreforge/execution';
import { ExecutionContextManager } from '@coreforge/execution-context';
import { InterceptorEngine } from '@coreforge/interceptors';
import { QueryBus } from '@coreforge/query';

import { ApplicationManager } from './ApplicationManager';
import { ApplicationService } from '../types/applicationTypes';

interface BuilderServiceEntry {
  readonly type: string;
  readonly service: ApplicationService<unknown, unknown>;
}

export class ApplicationBuilder {
  private _contextManager?: ExecutionContextManager | undefined;
  private _executionEngine?: ExecutionEngine | undefined;
  private _interceptorEngine?: InterceptorEngine | undefined;
  private _dispatcher?: Dispatcher | undefined;
  private _queryBus?: QueryBus | undefined;
  private readonly _services: BuilderServiceEntry[] = [];
  private _autoStart = false;

  public static create(): ApplicationBuilder {
    return new ApplicationBuilder();
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

  public withDispatcher(dispatcher: Dispatcher): this {
    this._dispatcher = dispatcher;
    return this;
  }

  public withQueryBus(queryBus: QueryBus): this {
    this._queryBus = queryBus;
    return this;
  }

  public withService<TInput, TResult>(
    type: string,
    service: ApplicationService<TInput, TResult>,
  ): this {
    this._services.push({
      type,
      service: service as ApplicationService<unknown, unknown>,
    });
    return this;
  }

  public withAutoStart(autoStart: boolean): this {
    this._autoStart = autoStart;
    return this;
  }

  public build(): ApplicationManager {
    const manager = new ApplicationManager({
      contextManager: this._contextManager,
      executionEngine: this._executionEngine,
      interceptorEngine: this._interceptorEngine,
      dispatcher: this._dispatcher,
      queryBus: this._queryBus,
      autoStart: false,
    });

    for (const entry of this._services) {
      manager.register(entry.type, entry.service);
    }

    if (this._autoStart) {
      manager.startSync();
    }

    return manager;
  }
}
