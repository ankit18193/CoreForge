import { ExecutionContextManager } from '@coreforge/execution-context';

import { ErrorClassifier } from '../classification/ErrorClassifier';
import { ErrorHandlingDiagnostics } from '../diagnostics/ErrorHandlingDiagnostics';
import { ErrorProcessingCoordinator } from '../execution/ErrorProcessingCoordinator';
import { ErrorHandlingLifecycleManager } from '../lifecycle/ErrorHandlingLifecycleManager';
import { ErrorNormalizer } from '../normalization/ErrorNormalizer';
import { ErrorHandlerRegistry } from '../registry/ErrorHandlerRegistry';
import {
  ApplicationError,
  ApplicationErrorCategory,
  ErrorHandler,
  ErrorHandlerOptions,
  ErrorHandlingConfig,
  ErrorHandlingDiagnosticsSnapshot,
  ErrorHandlingState,
  ErrorProcessingOptions,
  ErrorProcessingResult,
  IErrorHandlingEngine,
} from '../types/errorHandlingTypes';

export class ErrorHandlingEngine implements IErrorHandlingEngine {
  private readonly _lifecycle: ErrorHandlingLifecycleManager;
  private readonly _contextManager: ExecutionContextManager;
  private readonly _registry: ErrorHandlerRegistry;
  private readonly _diagnostics: ErrorHandlingDiagnostics;
  private readonly _config: ErrorHandlingConfig;

  constructor(config: ErrorHandlingConfig = {}) {
    this._lifecycle = new ErrorHandlingLifecycleManager();
    this._contextManager = config.contextManager ?? new ExecutionContextManager();
    this._registry = new ErrorHandlerRegistry();
    this._diagnostics = new ErrorHandlingDiagnostics();
    this._config = config;

    if (config.autoStart) {
      this.startSync();
    }
  }

  public get ready(): boolean {
    return this._lifecycle.isReady;
  }

  public get state(): ErrorHandlingState {
    return this._lifecycle.state;
  }

  public startSync(): void {
    this._lifecycle.start();
    this._registry.lock();
  }

  public async start(): Promise<void> {
    this.startSync();
  }

  public async stop(): Promise<void> {
    this._lifecycle.transitionToStopping();
    this._lifecycle.transitionToStopped();
  }

  public registerHandler<TError = unknown, TResult = unknown>(
    handler: ErrorHandler<TError, TResult>,
    options?: ErrorHandlerOptions,
  ): string {
    this._lifecycle.ensureCanRegister();
    return this._registry.register(handler, options);
  }

  public async process<TResult = unknown>(
    error: unknown,
    options?: ErrorProcessingOptions,
  ): Promise<ErrorProcessingResult<TResult>> {
    this._lifecycle.ensureReadyForProcessing();

    const effectiveOptions: ErrorProcessingOptions = {
      includeStack: options?.includeStack ?? this._config.includeStackDefault ?? false,
      maxCauseDepth: options?.maxCauseDepth ?? this._config.maxCauseDepthDefault ?? 5,
      ...options,
    };

    const context =
      options?.context ??
      this._contextManager.current() ??
      this._contextManager.create({ autoStart: true });

    if (context.state === 'CREATED') {
      context.start();
    }

    return this._contextManager.run(context, async () => {
      return ErrorProcessingCoordinator.coordinate<TResult>(
        error,
        context,
        this._registry,
        this._diagnostics,
        effectiveOptions,
        this._config.sensitiveKeys,
      );
    });
  }

  public classify(error: unknown): ApplicationErrorCategory {
    return ErrorClassifier.classify(error);
  }

  public normalize(error: unknown, options?: ErrorProcessingOptions): ApplicationError {
    const effectiveOptions: ErrorProcessingOptions = {
      includeStack: options?.includeStack ?? this._config.includeStackDefault ?? false,
      maxCauseDepth: options?.maxCauseDepth ?? this._config.maxCauseDepthDefault ?? 5,
      ...options,
    };

    return ErrorNormalizer.normalize(error, effectiveOptions, this._config.sensitiveKeys);
  }

  public getDiagnostics(): ErrorHandlingDiagnosticsSnapshot {
    return this._diagnostics.getSnapshot();
  }

  public resetDiagnostics(): void {
    this._diagnostics.reset();
  }
}
