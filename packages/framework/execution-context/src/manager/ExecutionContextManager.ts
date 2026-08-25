import {
  ExecutionContext,
  ExecutionContextManager as IExecutionContextManager,
  ExecutionContextOptions,
  ExecutionDiagnosticsSnapshot,
} from '@coreforge/contracts';

import { ExecutionContextFactory } from '../context/ExecutionContextFactory';
import { ExecutionDiagnostics } from '../diagnostics/ExecutionDiagnostics';
import { ExecutionLimitError } from '../errors/ExecutionContextErrors';
import { ExecutionContextLifecycleManager } from '../lifecycle/ExecutionContextLifecycleManager';
import { ExecutionMetadata } from '../metadata/ExecutionMetadata';
import { MetadataSanitizer } from '../metadata/MetadataSanitizer';
import { ExecutionContextStorage } from '../storage/ExecutionContextStorage';
import { ExecutionContextConfig, ExecutionManagerState } from '../types/executionContextTypes';

export class ExecutionContextManager implements IExecutionContextManager {
  private readonly _lifecycle: ExecutionContextLifecycleManager;
  private readonly _storage: ExecutionContextStorage;
  private readonly _sanitizer: MetadataSanitizer;
  private readonly _metadataHelper: ExecutionMetadata;
  private readonly _diagnostics: ExecutionDiagnostics;
  private readonly _defaultMetadata?: Readonly<Record<string, unknown>> | undefined;
  private readonly _autoStart: boolean;

  constructor(config: ExecutionContextConfig = {}) {
    this._lifecycle = new ExecutionContextLifecycleManager();
    this._storage = new ExecutionContextStorage();
    this._sanitizer = new MetadataSanitizer(config.metadataLimits);
    this._metadataHelper = new ExecutionMetadata(this._sanitizer);
    this._diagnostics = new ExecutionDiagnostics();
    this._defaultMetadata = config.defaultMetadata
      ? this._metadataHelper.createSnapshot(config.defaultMetadata)
      : undefined;
    this._autoStart = config.autoStart ?? false;

    const autoStartManager = config.autoStart !== undefined ? true : true;
    if (autoStartManager) {
      this._lifecycle.start();
    }
  }

  public get ready(): boolean {
    return this._lifecycle.isReady;
  }

  public get state(): ExecutionManagerState {
    return this._lifecycle.state;
  }

  public async start(): Promise<void> {
    this._lifecycle.start();
  }

  public async stop(): Promise<void> {
    this._lifecycle.transitionToStopping();
    this._storage.disable();
    this._lifecycle.transitionToStopped();
  }

  public create(options?: ExecutionContextOptions): ExecutionContext {
    this._lifecycle.ensureReadyForCreation();

    try {
      return ExecutionContextFactory.create(
        options,
        this._defaultMetadata,
        this._metadataHelper,
        this._diagnostics,
        this._autoStart,
      );
    } catch (err: unknown) {
      if (err instanceof ExecutionLimitError) {
        this._diagnostics.recordMetadataRejection();
      }
      throw err;
    }
  }

  public current(): ExecutionContext | undefined {
    return this._storage.current();
  }

  public run<T>(context: ExecutionContext, callback: () => T | Promise<T>): T | Promise<T> {
    this._lifecycle.ensureOperational();

    if (context.state === 'CREATED') {
      context.start();
    }

    return this._storage.run(context, callback);
  }

  public getDiagnostics(): ExecutionDiagnosticsSnapshot {
    return this._diagnostics.getSnapshot();
  }

  public resetDiagnostics(): void {
    this._diagnostics.reset();
  }
}
