import { ExecutionContextManager } from '@coreforge/execution-context';

import { ErrorHandlingEngine } from './ErrorHandlingEngine';
import { ErrorHandler, ErrorHandlerOptions } from '../types/errorHandlingTypes';

interface BuilderHandlerEntry {
  readonly handler: ErrorHandler<unknown, unknown>;
  readonly options?: ErrorHandlerOptions | undefined;
}

export class ErrorHandlingBuilder {
  private _contextManager?: ExecutionContextManager | undefined;
  private _includeStackDefault = false;
  private _maxCauseDepthDefault = 5;
  private _sensitiveKeys?: readonly string[] | undefined;
  private readonly _handlers: BuilderHandlerEntry[] = [];
  private _autoStart = false;

  public static create(): ErrorHandlingBuilder {
    return new ErrorHandlingBuilder();
  }

  public withContextManager(manager: ExecutionContextManager): this {
    this._contextManager = manager;
    return this;
  }

  public withIncludeStackDefault(include: boolean): this {
    this._includeStackDefault = include;
    return this;
  }

  public withMaxCauseDepthDefault(depth: number): this {
    this._maxCauseDepthDefault = depth;
    return this;
  }

  public withSensitiveKeys(keys: readonly string[]): this {
    this._sensitiveKeys = keys;
    return this;
  }

  public withHandler<TError = unknown, TResult = unknown>(
    handler: ErrorHandler<TError, TResult>,
    options?: ErrorHandlerOptions,
  ): this {
    this._handlers.push({
      handler: handler as ErrorHandler<unknown, unknown>,
      options,
    });
    return this;
  }

  public withAutoStart(autoStart: boolean): this {
    this._autoStart = autoStart;
    return this;
  }

  public build(): ErrorHandlingEngine {
    const engine = new ErrorHandlingEngine({
      contextManager: this._contextManager,
      includeStackDefault: this._includeStackDefault,
      maxCauseDepthDefault: this._maxCauseDepthDefault,
      sensitiveKeys: this._sensitiveKeys,
      autoStart: false,
    });

    for (const entry of this._handlers) {
      engine.registerHandler(entry.handler, entry.options);
    }

    if (this._autoStart) {
      engine.startSync();
    }

    return engine;
  }
}
