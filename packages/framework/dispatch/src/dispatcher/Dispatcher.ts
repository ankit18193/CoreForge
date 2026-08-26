import type {
  Command,
  CommandHandler,
  DispatchDiagnosticsSnapshot,
  Dispatcher as IDispatcher,
  DispatchOptions,
  DispatchResult,
} from '@coreforge/contracts';
import { ExecutionEngine } from '@coreforge/execution';
import { ExecutionContextManager } from '@coreforge/execution-context';
import { InterceptorEngine } from '@coreforge/interceptors';

import { DispatchDiagnostics } from '../diagnostics/DispatchDiagnostics';
import { DispatchExecutor } from '../executor/DispatchExecutor';
import { DispatchLifecycleManager } from '../lifecycle/DispatchLifecycleManager';
import { CommandHandlerRegistry } from '../registry/CommandHandlerRegistry';
import { DispatcherOptions, DispatchState } from '../types/dispatchTypes';

export class Dispatcher implements IDispatcher {
  private readonly _lifecycle: DispatchLifecycleManager;
  private readonly _contextManager: ExecutionContextManager;
  private readonly _executionEngine: ExecutionEngine;
  private readonly _interceptorEngine: InterceptorEngine;
  private readonly _registry: CommandHandlerRegistry;
  private readonly _diagnostics: DispatchDiagnostics;
  private readonly _executor: DispatchExecutor;

  constructor(options: DispatcherOptions = {}) {
    this._lifecycle = new DispatchLifecycleManager();
    this._contextManager = options.contextManager ?? new ExecutionContextManager();
    this._executionEngine = options.executionEngine ?? new ExecutionEngine({ autoStart: false });
    this._interceptorEngine =
      options.interceptorEngine ?? new InterceptorEngine({ autoStart: false });
    this._registry = new CommandHandlerRegistry();
    this._diagnostics = new DispatchDiagnostics();

    this._executor = new DispatchExecutor(
      this._contextManager,
      this._executionEngine,
      this._interceptorEngine,
      this._lifecycle,
      this._registry,
      this._diagnostics,
    );

    const autoStart = options.autoStart ?? false;
    if (autoStart) {
      this.startSync();
    }
  }

  public get ready(): boolean {
    return this._lifecycle.isReady;
  }

  public get state(): DispatchState {
    return this._lifecycle.state;
  }

  public get executionEngine(): ExecutionEngine {
    return this._executionEngine;
  }

  public get interceptorEngine(): InterceptorEngine {
    return this._interceptorEngine;
  }

  public startSync(): void {
    if (!this._executionEngine.ready) {
      this._executionEngine.start();
    }
    if (!this._interceptorEngine.ready) {
      this._interceptorEngine.start();
    }
    this._lifecycle.start();
    this._registry.lock();
  }

  public async start(): Promise<void> {
    this.startSync();
  }

  public async stop(): Promise<void> {
    this._lifecycle.transitionToStopping();
    await this._interceptorEngine.stop();
    this._executionEngine.stop();
    this._lifecycle.transitionToStopped();
  }

  public register<TPayload = unknown, TResult = unknown>(
    type: string,
    handler: CommandHandler<TPayload, TResult>,
  ): void {
    try {
      this._lifecycle.ensureCanRegister();
      this._registry.register(type, handler);
    } catch (err: unknown) {
      this._diagnostics.recordRegistrationFailure();
      throw err;
    }
  }

  public async dispatch<TPayload = unknown, TResult = unknown>(
    command: Command<TPayload>,
    options?: DispatchOptions,
  ): Promise<DispatchResult<TResult>> {
    return this._executor.execute(command, options);
  }

  public getDiagnostics(): DispatchDiagnosticsSnapshot {
    return this._diagnostics.getSnapshot();
  }

  public resetDiagnostics(): void {
    this._diagnostics.reset();
  }
}
