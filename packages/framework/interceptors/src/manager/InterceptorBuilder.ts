import { ExecutionContextManager } from '@coreforge/execution-context';

import { InterceptorEngine } from './InterceptorEngine';
import { Interceptor, InterceptorOptions } from '../types/interceptorTypes';

interface BuilderInterceptorEntry {
  readonly interceptor: Interceptor<unknown, unknown>;
  readonly options?: InterceptorOptions | undefined;
}

export class InterceptorBuilder {
  private _contextManager?: ExecutionContextManager | undefined;
  private readonly _interceptors: BuilderInterceptorEntry[] = [];
  private _autoStart = false;

  public withContextManager(manager: ExecutionContextManager): this {
    this._contextManager = manager;
    return this;
  }

  public withInterceptor<TInput, TResult>(
    interceptor: Interceptor<TInput, TResult>,
    options?: InterceptorOptions,
  ): this {
    this._interceptors.push({
      interceptor: interceptor as Interceptor<unknown, unknown>,
      options,
    });
    return this;
  }

  public withAutoStart(autoStart: boolean): this {
    this._autoStart = autoStart;
    return this;
  }

  public build(): InterceptorEngine {
    const engine = new InterceptorEngine({
      contextManager: this._contextManager,
      autoStart: false,
    });

    for (const entry of this._interceptors) {
      engine.use(entry.interceptor, entry.options);
    }

    if (this._autoStart) {
      engine.start();
    }

    return engine;
  }
}
