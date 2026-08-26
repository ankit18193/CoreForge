import type {
  ExecutionContext,
  InterceptorDiagnosticsSnapshot,
  InterceptorEngine as IInterceptorEngine,
  InterceptorResult,
} from '@coreforge/contracts';
import { ExecutionContextManager } from '@coreforge/execution-context';

import { InterceptorDiagnostics } from '../diagnostics/InterceptorDiagnostics';
import { InterceptorRegistrationError } from '../errors/InterceptorErrors';
import { InterceptorExecutor } from '../interceptor/InterceptorExecutor';
import { InterceptorLifecycleManager } from '../lifecycle/InterceptorLifecycleManager';
import { InterceptorRegistry } from '../registry/InterceptorRegistry';
import {
  Interceptor,
  InterceptorEngineOptions,
  InterceptorOptions,
  InterceptorState,
} from '../types/interceptorTypes';

export class InterceptorEngine implements IInterceptorEngine {
  private readonly _lifecycle: InterceptorLifecycleManager;
  private readonly _contextManager: ExecutionContextManager;
  private readonly _registry: InterceptorRegistry;
  private readonly _diagnostics: InterceptorDiagnostics;
  private readonly _executor: InterceptorExecutor;

  constructor(options: InterceptorEngineOptions = {}) {
    this._lifecycle = new InterceptorLifecycleManager();
    this._contextManager = options.contextManager ?? new ExecutionContextManager();
    this._registry = new InterceptorRegistry();
    this._diagnostics = new InterceptorDiagnostics();
    this._executor = new InterceptorExecutor(
      this._contextManager,
      this._lifecycle,
      this._registry,
      this._diagnostics,
    );

    const autoStart = options.autoStart ?? false;
    if (autoStart) {
      this._lifecycle.start();
      this._registry.lock();
    }
  }

  public get ready(): boolean {
    return this._lifecycle.isReady;
  }

  public get state(): InterceptorState {
    return this._lifecycle.state;
  }

  public async start(): Promise<void> {
    this._lifecycle.start();
    this._registry.lock();
  }

  public async stop(): Promise<void> {
    this._lifecycle.transitionToStopping();
    this._lifecycle.transitionToStopped();
  }

  public use<TInput = unknown, TResult = unknown>(
    interceptor: Interceptor<TInput, TResult>,
    options?: InterceptorOptions,
  ): void {
    if (this._lifecycle.state !== 'CREATED') {
      throw new InterceptorRegistrationError(
        `Cannot register interceptor when engine is in ${this._lifecycle.state} state`,
      );
    }
    this._registry.register(interceptor, options);
  }

  public async execute<TInput = unknown, TResult = unknown>(
    input: TInput,
    handler: (input: TInput, context: ExecutionContext) => Promise<TResult> | TResult,
    options?: { readonly context?: ExecutionContext | undefined },
  ): Promise<InterceptorResult<TResult>> {
    return this._executor.execute(input, handler, options);
  }

  public getDiagnostics(): InterceptorDiagnosticsSnapshot {
    return this._diagnostics.getSnapshot();
  }

  public resetDiagnostics(): void {
    this._diagnostics.reset();
  }
}
