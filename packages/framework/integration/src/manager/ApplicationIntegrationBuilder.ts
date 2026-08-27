import { ApplicationManager } from '@coreforge/application';
import { Dispatcher } from '@coreforge/dispatch';
import { ErrorHandlingEngine } from '@coreforge/error-handling';
import { EventPublisher } from '@coreforge/events';
import { ExecutionEngine } from '@coreforge/execution';
import { ExecutionContextManager } from '@coreforge/execution-context';
import { HookManager } from '@coreforge/hooks';
import { InterceptorEngine } from '@coreforge/interceptors';
import { ApplicationKernel } from '@coreforge/kernel';
import { QueryBus } from '@coreforge/query';

import { ApplicationIntegration } from './ApplicationIntegration';

export class ApplicationIntegrationBuilder {
  private _contextManager?: ExecutionContextManager | undefined;
  private _executionEngine?: ExecutionEngine | undefined;
  private _interceptorEngine?: InterceptorEngine | undefined;
  private _dispatcher?: Dispatcher | undefined;
  private _queryBus?: QueryBus | undefined;
  private _eventPublisher?: EventPublisher | undefined;
  private _applicationManager?: ApplicationManager | undefined;
  private _errorEngine?: ErrorHandlingEngine | undefined;
  private _hookManager?: HookManager | undefined;
  private _kernel?: ApplicationKernel | undefined;
  private _autoStart = false;

  public static create(): ApplicationIntegrationBuilder {
    return new ApplicationIntegrationBuilder();
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

  public withEventPublisher(publisher: EventPublisher): this {
    this._eventPublisher = publisher;
    return this;
  }

  public withApplicationManager(manager: ApplicationManager): this {
    this._applicationManager = manager;
    return this;
  }

  public withErrorEngine(engine: ErrorHandlingEngine): this {
    this._errorEngine = engine;
    return this;
  }

  public withHookManager(manager: HookManager): this {
    this._hookManager = manager;
    return this;
  }

  public withKernel(kernel: ApplicationKernel): this {
    this._kernel = kernel;
    return this;
  }

  public withAutoStart(autoStart: boolean): this {
    this._autoStart = autoStart;
    return this;
  }

  public build(): ApplicationIntegration {
    return new ApplicationIntegration({
      contextManager: this._contextManager,
      executionEngine: this._executionEngine,
      interceptorEngine: this._interceptorEngine,
      dispatcher: this._dispatcher,
      queryBus: this._queryBus,
      eventPublisher: this._eventPublisher,
      applicationManager: this._applicationManager,
      errorEngine: this._errorEngine,
      hookManager: this._hookManager,
      kernel: this._kernel,
      autoStart: this._autoStart,
    });
  }
}
