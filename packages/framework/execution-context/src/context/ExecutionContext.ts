import { ExecutionContext as IExecutionContext, ExecutionState } from '@coreforge/contracts';

import { ChildContextFactory } from './ChildContextFactory';
import { ExecutionCancellation } from '../cancellation/ExecutionCancellation';
import { ExecutionDiagnostics } from '../diagnostics/ExecutionDiagnostics';
import { ExecutionContextStateError, ExecutionLimitError } from '../errors/ExecutionContextErrors';
import { ExecutionProfiler } from '../internal/ExecutionProfiler';
import { ExecutionMetadata } from '../metadata/ExecutionMetadata';

export class ExecutionContext implements IExecutionContext {
  private readonly _executionId: string;
  private readonly _parentExecutionId?: string | undefined;
  private readonly _metadata: Readonly<Record<string, unknown>>;
  private readonly _cancellation: ExecutionCancellation;
  private readonly _createdAt: number;
  private _startedAt?: number | undefined;
  private _completedAt?: number | undefined;
  private _durationMs?: number | undefined;
  private _state: ExecutionState = 'CREATED';

  private readonly _profiler: ExecutionProfiler;
  private readonly _diagnostics: ExecutionDiagnostics;
  private readonly _metadataHelper: ExecutionMetadata;

  constructor(options: {
    executionId: string;
    parentExecutionId?: string | undefined;
    metadata: Readonly<Record<string, unknown>>;
    cancellation: ExecutionCancellation;
    diagnostics: ExecutionDiagnostics;
    metadataHelper: ExecutionMetadata;
    autoStart?: boolean | undefined;
  }) {
    this._executionId = options.executionId;
    this._parentExecutionId = options.parentExecutionId;
    this._metadata = options.metadata;
    this._cancellation = options.cancellation;
    this._diagnostics = options.diagnostics;
    this._metadataHelper = options.metadataHelper;
    this._createdAt = Date.now();
    this._profiler = new ExecutionProfiler();

    const autoStart = options.autoStart ?? false;
    if (autoStart) {
      this.start();
    }
  }

  public get executionId(): string {
    return this._executionId;
  }

  public get parentExecutionId(): string | undefined {
    return this._parentExecutionId;
  }

  public get metadata(): Readonly<Record<string, unknown>> {
    return this._metadata;
  }

  public get signal(): AbortSignal {
    return this._cancellation.signal;
  }

  public get state(): ExecutionState {
    return this._state;
  }

  public get createdAt(): number {
    return this._createdAt;
  }

  public get startedAt(): number | undefined {
    return this._startedAt;
  }

  public get completedAt(): number | undefined {
    return this._completedAt;
  }

  public get durationMs(): number | undefined {
    return this._durationMs;
  }

  public start(): void {
    if (this._isTerminal()) {
      throw new ExecutionContextStateError(
        `Cannot start execution context in terminal state (${this._state})`,
        { executionId: this._executionId, state: this._state },
      );
    }

    if (this._state === 'ACTIVE') {
      return; // Idempotent
    }

    this._state = 'ACTIVE';
    this._startedAt = Date.now();
    this._profiler.start();
    this._diagnostics.recordContextStarted();
  }

  public complete(): void {
    if (this._isTerminal()) {
      return; // Idempotent
    }

    if (this._state === 'CREATED') {
      this.start();
    }

    this._state = 'COMPLETED';
    this._completedAt = Date.now();
    this._durationMs = Math.round(this._profiler.elapsedMs * 100) / 100;
    this._diagnostics.recordContextCompleted(this._durationMs);
    this._cancellation.dispose();
  }

  public fail(): void {
    if (this._isTerminal()) {
      return; // Idempotent
    }

    if (this._state === 'CREATED') {
      this.start();
    }

    this._state = 'FAILED';
    this._completedAt = Date.now();
    this._durationMs = Math.round(this._profiler.elapsedMs * 100) / 100;
    this._diagnostics.recordContextFailed(this._durationMs);
    this._cancellation.dispose();
  }

  public cancel(): void {
    if (this._isTerminal()) {
      this._cancellation.cancel();
      return; // Idempotent
    }

    if (this._state === 'CREATED') {
      this.start();
    }

    this._state = 'CANCELLED';
    this._completedAt = Date.now();
    this._durationMs = Math.round(this._profiler.elapsedMs * 100) / 100;
    this._cancellation.cancel();
    this._diagnostics.recordCancellation();
    this._diagnostics.recordContextCancelled(this._durationMs);
  }

  public child(metadata?: Readonly<Record<string, unknown>>): IExecutionContext {
    try {
      return ChildContextFactory.create(this, metadata, this._metadataHelper, this._diagnostics);
    } catch (err: unknown) {
      if (err instanceof ExecutionLimitError) {
        this._diagnostics.recordMetadataRejection();
      }
      throw err;
    }
  }

  private _isTerminal(): boolean {
    return this._state === 'COMPLETED' || this._state === 'FAILED' || this._state === 'CANCELLED';
  }
}
