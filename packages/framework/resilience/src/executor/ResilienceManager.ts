import {
  ResilienceDiagnosticsSnapshot,
  ResilienceExecutionOptions,
  ResilienceExecutor,
  ResilienceManager as IResilienceManager,
} from '@coreforge/contracts';

import { ResilienceExecutorInstance } from './ResilienceExecutorInstance';
import { Bulkhead } from '../bulkhead/Bulkhead';
import { CircuitBreaker } from '../circuit/CircuitBreaker';
import { ResilienceDiagnostics } from '../diagnostics/ResilienceDiagnostics';
import { ResilienceStateError } from '../errors/ResilienceErrors';
import { ResilienceLifecycleManager } from '../lifecycle/ResilienceLifecycleManager';
import { ResilienceOptions, ResilienceState } from '../types/resilienceTypes';

export class ResilienceManager implements IResilienceManager {
  private readonly _lifecycle: ResilienceLifecycleManager;
  private readonly _diagnostics: ResilienceDiagnostics;
  private readonly _defaultOptions?: ResilienceExecutionOptions | undefined;
  private readonly _circuitBreaker?: CircuitBreaker | undefined;
  private readonly _bulkhead?: Bulkhead | undefined;

  constructor(options: ResilienceOptions = {}) {
    this._lifecycle = new ResilienceLifecycleManager();
    this._diagnostics = new ResilienceDiagnostics();
    this._defaultOptions = options.defaultOptions;

    if (options.defaultOptions?.circuitBreaker) {
      this._circuitBreaker = new CircuitBreaker(options.defaultOptions.circuitBreaker, () =>
        this._diagnostics.recordCircuitTransition(),
      );
    }

    if (options.defaultOptions?.bulkhead) {
      this._bulkhead = new Bulkhead(options.defaultOptions.bulkhead);
    }

    const autoStart = options.autoStart ?? true;
    if (autoStart) {
      this._lifecycle.start();
    }
  }

  public get ready(): boolean {
    return this._lifecycle.isReady;
  }

  public get state(): ResilienceState {
    return this._lifecycle.state;
  }

  public async start(): Promise<void> {
    this._lifecycle.start();
  }

  public async stop(): Promise<void> {
    this._lifecycle.transitionToStopping();
    if (this._bulkhead) {
      this._bulkhead.evacuateAll(
        new ResilienceStateError('Resilience manager is shutting down; operation rejected', {
          state: 'STOPPING',
        }),
      );
    }
    this._lifecycle.transitionToStopped();
  }

  public executor(options?: ResilienceExecutionOptions): ResilienceExecutor {
    const mergedOptions: ResilienceExecutionOptions = {
      ...this._defaultOptions,
      ...options,
    };

    return new ResilienceExecutorInstance(
      this._lifecycle,
      this._diagnostics,
      mergedOptions,
      this._circuitBreaker,
      this._bulkhead,
    );
  }

  public getDiagnostics(): ResilienceDiagnosticsSnapshot {
    return this._diagnostics.getSnapshot();
  }

  public resetDiagnostics(): void {
    this._diagnostics.reset();
  }
}
