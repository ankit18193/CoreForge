import {
  ExecutionEngine as IExecutionEngine,
  ExecutionEngineDiagnosticsSnapshot,
  ExecutionHandler,
  ExecutionMiddleware,
  ExecutionOptions,
  ExecutionResult,
} from '@coreforge/contracts';
import { ExecutionContextManager } from '@coreforge/execution-context';

import { ExecutionDiagnostics } from '../diagnostics/ExecutionDiagnostics';
import { ExecutionMiddlewareRegistrationError } from '../errors/ExecutionErrors';
import { ExecutionCoordinator } from '../executor/ExecutionCoordinator';
import { ExecutionEngineLifecycleManager } from '../lifecycle/ExecutionEngineLifecycleManager';
import { MiddlewareRegistry } from '../middleware/MiddlewareRegistry';
import { ExecutionEngineOptions, ExecutionEngineState } from '../types/executionTypes';

export class ExecutionEngine implements IExecutionEngine {
  private readonly _lifecycle: ExecutionEngineLifecycleManager;
  private readonly _contextManager: ExecutionContextManager;
  private readonly _middlewareRegistry: MiddlewareRegistry;
  private readonly _diagnostics: ExecutionDiagnostics;
  private readonly _coordinator: ExecutionCoordinator;

  constructor(options: ExecutionEngineOptions = {}) {
    this._lifecycle = new ExecutionEngineLifecycleManager();
    this._contextManager = options.contextManager ?? new ExecutionContextManager();
    this._middlewareRegistry = new MiddlewareRegistry();
    this._diagnostics = new ExecutionDiagnostics();
    this._coordinator = new ExecutionCoordinator(
      this._contextManager,
      this._lifecycle,
      this._middlewareRegistry,
      this._diagnostics,
    );

    const autoStart = options.autoStart ?? false;
    if (autoStart) {
      this._lifecycle.start();
      this._middlewareRegistry.lock();
    }
  }

  public get ready(): boolean {
    return this._lifecycle.isReady;
  }

  public get state(): ExecutionEngineState {
    return this._lifecycle.state;
  }

  public async start(): Promise<void> {
    this._lifecycle.start();
    this._middlewareRegistry.lock();
  }

  public async stop(): Promise<void> {
    this._lifecycle.transitionToStopping();
    this._lifecycle.transitionToStopped();
  }

  public use<TInput = unknown, TResult = unknown>(
    middleware: ExecutionMiddleware<TInput, TResult>,
  ): void {
    if (this._lifecycle.state !== 'CREATED') {
      throw new ExecutionMiddlewareRegistrationError(
        `Cannot register middleware when execution engine is in ${this._lifecycle.state} state`,
      );
    }
    this._middlewareRegistry.register(middleware);
  }

  public async execute<TInput = unknown, TResult = unknown>(
    input: TInput,
    handler: ExecutionHandler<TInput, TResult>,
    options?: ExecutionOptions,
  ): Promise<ExecutionResult<TResult>> {
    return this._coordinator.execute(input, handler, options);
  }

  public getDiagnostics(): ExecutionEngineDiagnosticsSnapshot {
    return this._diagnostics.getSnapshot();
  }

  public resetDiagnostics(): void {
    this._diagnostics.reset();
  }
}
