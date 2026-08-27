import { ExecutionContextManager } from '@coreforge/execution-context';

import { HookManager } from './HookManager';
import { Hook, HookFailureStrategy, HookOptions } from '../types/hookTypes';

interface BuilderHookEntry {
  readonly hook: Hook<unknown, unknown>;
  readonly options?: HookOptions | undefined;
}

export class HookBuilder {
  private _contextManager?: ExecutionContextManager | undefined;
  private _defaultFailureStrategy?: HookFailureStrategy | undefined;
  private _defaultTimeoutMs?: number | undefined;
  private _autoStart = false;
  private readonly _hooks: BuilderHookEntry[] = [];

  public static create(): HookBuilder {
    return new HookBuilder();
  }

  public withContextManager(manager: ExecutionContextManager): this {
    this._contextManager = manager;
    return this;
  }

  public withDefaultFailureStrategy(strategy: HookFailureStrategy): this {
    this._defaultFailureStrategy = strategy;
    return this;
  }

  public withDefaultTimeout(timeoutMs: number): this {
    this._defaultTimeoutMs = timeoutMs;
    return this;
  }

  public withAutoStart(autoStart: boolean): this {
    this._autoStart = autoStart;
    return this;
  }

  public withHook<TPayload = unknown, TResult = unknown>(
    hook: Hook<TPayload, TResult>,
    options?: HookOptions,
  ): this {
    this._hooks.push({
      hook: hook as unknown as Hook<unknown, unknown>,
      options,
    });
    return this;
  }

  public build(): HookManager {
    const manager = new HookManager({
      contextManager: this._contextManager,
      defaultFailureStrategy: this._defaultFailureStrategy,
      defaultTimeoutMs: this._defaultTimeoutMs,
      autoStart: false,
    });

    for (const entry of this._hooks) {
      manager.register(entry.hook, entry.options);
    }

    if (this._autoStart) {
      // Auto-start can be called synchronously if start() transitions state
      manager.start();
    }

    return manager;
  }
}
