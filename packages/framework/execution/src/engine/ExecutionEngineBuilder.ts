import { ExecutionContextManager } from '@coreforge/execution-context';

import { ExecutionEngine } from './ExecutionEngine';
import { ExecutionMiddleware } from '../types/executionTypes';

export class ExecutionEngineBuilder {
  private _contextManager?: ExecutionContextManager | undefined;
  private readonly _middlewares: ExecutionMiddleware<unknown, unknown>[] = [];
  private _autoStart = false;

  public withContextManager(manager: ExecutionContextManager): this {
    this._contextManager = manager;
    return this;
  }

  public withMiddleware<TInput, TResult>(middleware: ExecutionMiddleware<TInput, TResult>): this {
    this._middlewares.push(middleware as ExecutionMiddleware<unknown, unknown>);
    return this;
  }

  public withAutoStart(autoStart: boolean): this {
    this._autoStart = autoStart;
    return this;
  }

  public build(): ExecutionEngine {
    const engine = new ExecutionEngine({
      contextManager: this._contextManager,
      autoStart: false,
    });

    for (const mw of this._middlewares) {
      engine.use(mw);
    }

    if (this._autoStart) {
      engine.start();
    }

    return engine;
  }
}
