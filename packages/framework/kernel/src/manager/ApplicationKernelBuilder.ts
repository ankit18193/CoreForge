import { ApplicationManager } from '@coreforge/application';
import { Dispatcher } from '@coreforge/dispatch';
import { EventPublisher } from '@coreforge/events';
import { ExecutionEngine } from '@coreforge/execution';
import { ExecutionContextManager } from '@coreforge/execution-context';
import { QueryBus } from '@coreforge/query';

import { ApplicationKernel } from './ApplicationKernel';
import { ErrorHandlingEngine, KernelComponent, KernelComponentOptions } from '../types/kernelTypes';

interface BuilderComponentEntry {
  readonly component: KernelComponent;
  readonly options?: KernelComponentOptions | undefined;
}

export class ApplicationKernelBuilder {
  private _contextManager?: ExecutionContextManager | undefined;
  private _executionEngine?: ExecutionEngine | undefined;
  private _dispatcher?: Dispatcher | undefined;
  private _queryBus?: QueryBus | undefined;
  private _eventPublisher?: EventPublisher | undefined;
  private _applicationManager?: ApplicationManager | undefined;
  private _errorEngine?: ErrorHandlingEngine | undefined;
  private readonly _components: BuilderComponentEntry[] = [];
  private _autoStart = false;
  private _gracefulShutdown = true;
  private _shutdownTimeoutMs = 5000;

  public static create(): ApplicationKernelBuilder {
    return new ApplicationKernelBuilder();
  }

  public withContextManager(manager: ExecutionContextManager): this {
    this._contextManager = manager;
    return this;
  }

  public withExecutionEngine(engine: ExecutionEngine): this {
    this._executionEngine = engine;
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

  public withErrorEngine(errorEngine: ErrorHandlingEngine): this {
    this._errorEngine = errorEngine;
    return this;
  }

  public withComponent(component: KernelComponent, options?: KernelComponentOptions): this {
    this._components.push({ component, options });
    return this;
  }

  public withAutoStart(autoStart: boolean): this {
    this._autoStart = autoStart;
    return this;
  }

  public withGracefulShutdown(graceful: boolean): this {
    this._gracefulShutdown = graceful;
    return this;
  }

  public withShutdownTimeout(timeoutMs: number): this {
    this._shutdownTimeoutMs = timeoutMs;
    return this;
  }

  public build(): ApplicationKernel {
    const kernel = new ApplicationKernel({
      contextManager: this._contextManager,
      executionEngine: this._executionEngine,
      dispatcher: this._dispatcher,
      queryBus: this._queryBus,
      eventPublisher: this._eventPublisher,
      applicationManager: this._applicationManager,
      errorEngine: this._errorEngine,
      autoStart: false,
      gracefulShutdown: this._gracefulShutdown,
      shutdownTimeoutMs: this._shutdownTimeoutMs,
    });

    for (const entry of this._components) {
      kernel.registerComponent(entry.component, entry.options);
    }

    if (this._autoStart) {
      // Return unstarted but auto-configured; or invoke start in async code
    }

    return kernel;
  }
}
