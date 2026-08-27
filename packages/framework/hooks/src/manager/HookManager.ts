import { ExecutionContextManager } from '@coreforge/execution-context';

import { HookDiagnostics } from '../diagnostics/HookDiagnostics';
import { HookCoordinator } from '../execution/HookCoordinator';
import { HookLifecycleManager } from '../lifecycle/HookLifecycleManager';
import { HookRegistry } from '../registry/HookRegistry';
import {
  Hook,
  HookBatchResult,
  HookDiagnosticsSnapshot,
  HookDispatchOptions,
  HookFailureStrategy,
  HookManagerConfig,
  HookOptions,
  HookState,
  HookType,
  IHookManager,
} from '../types/hookTypes';

export class HookManager implements IHookManager {
  private readonly _lifecycle: HookLifecycleManager;
  private readonly _registry: HookRegistry;
  private readonly _diagnostics: HookDiagnostics;
  private readonly _contextManager: ExecutionContextManager;
  private readonly _defaultStrategy: HookFailureStrategy;
  private readonly _defaultTimeoutMs?: number | undefined;

  constructor(config: HookManagerConfig = {}) {
    this._lifecycle = new HookLifecycleManager();
    this._registry = new HookRegistry();
    this._diagnostics = new HookDiagnostics();
    this._contextManager = config.contextManager ?? new ExecutionContextManager();
    this._defaultStrategy = config.defaultFailureStrategy ?? 'CONTINUE';
    this._defaultTimeoutMs = config.defaultTimeoutMs;

    if (config.autoStart) {
      this._lifecycle.start();
      this._registry.lock();
    }
  }

  public get ready(): boolean {
    return this._lifecycle.isReady;
  }

  public get state(): HookState {
    return this._lifecycle.state;
  }

  public get size(): number {
    return this._registry.size;
  }

  public async start(): Promise<void> {
    if (this._lifecycle.isReady) {
      return; // Idempotent
    }
    this._lifecycle.start();
    this._registry.lock();
  }

  public async stop(): Promise<void> {
    if (this._lifecycle.isStopped) {
      return; // Idempotent
    }
    this._lifecycle.transitionToStopping();
    this._lifecycle.transitionToStopped();
  }

  public register<TPayload = unknown, TResult = unknown>(
    hook: Hook<TPayload, TResult>,
    options?: HookOptions,
  ): void {
    this._lifecycle.ensureCanRegister();
    try {
      this._registry.register(hook, options);
    } catch (err) {
      this._diagnostics.recordRegistrationFailure();
      throw err;
    }
  }

  public async execute<TPayload = unknown, TResult = unknown>(
    type: HookType,
    payload?: TPayload,
    options?: HookDispatchOptions,
  ): Promise<HookBatchResult<TResult>> {
    this._lifecycle.ensureReadyForOperations();

    const context = options?.context ?? this._contextManager.current();

    const effectiveOptions: HookDispatchOptions = {
      ...options,
      context,
      timeoutMs: options?.timeoutMs ?? this._defaultTimeoutMs,
      failureStrategy: options?.failureStrategy,
    };

    if (context) {
      return this._contextManager.run(context, () =>
        HookCoordinator.executeBatch<TPayload, TResult>(
          this._registry,
          type,
          payload as TPayload,
          this._diagnostics,
          effectiveOptions,
          this._defaultStrategy,
        ),
      );
    }

    return HookCoordinator.executeBatch<TPayload, TResult>(
      this._registry,
      type,
      payload as TPayload,
      this._diagnostics,
      effectiveOptions,
      this._defaultStrategy,
    );
  }

  public getDiagnostics(): HookDiagnosticsSnapshot {
    return this._diagnostics.getSnapshot();
  }

  public resetDiagnostics(): void {
    this._diagnostics.reset();
  }
}
