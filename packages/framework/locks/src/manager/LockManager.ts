import {
  Lock,
  LockDiagnosticsSnapshot,
  LockManager as ILockManager,
  LockProvider,
} from '@coreforge/contracts';

import { LockInstance } from './LockInstance';
import { LockAcquisitionManager } from '../acquisition/LockAcquisitionManager';
import { LockDiagnostics } from '../diagnostics/LockDiagnostics';
import { LockStateError } from '../errors/LockErrors';
import { LockLifecycleManager } from '../lifecycle/LockLifecycleManager';
import { MemoryLockProvider } from '../provider/MemoryLockProvider';
import { LockManagerOptions, LockState } from '../types/lockTypes';

export class LockManager implements ILockManager {
  private readonly _provider: LockProvider;
  private readonly _acquisitionManager: LockAcquisitionManager;
  private readonly _lifecycle: LockLifecycleManager;
  private readonly _diagnostics: LockDiagnostics;
  private readonly _defaultTtlMs?: number | undefined;
  private readonly _defaultTimeoutMs?: number | undefined;

  constructor(options: LockManagerOptions = {}, provider?: LockProvider) {
    this._provider = provider ?? new MemoryLockProvider();
    this._acquisitionManager = new LockAcquisitionManager();
    this._lifecycle = new LockLifecycleManager();
    this._diagnostics = new LockDiagnostics();
    this._defaultTtlMs = options.defaultTtlMs;
    this._defaultTimeoutMs = options.defaultTimeoutMs;

    const autoStart = options.autoStart ?? true;
    if (autoStart) {
      this._lifecycle.start();
    }
  }

  public get ready(): boolean {
    return this._lifecycle.isReady;
  }

  public get state(): LockState {
    return this._lifecycle.state;
  }

  public get provider(): LockProvider {
    return this._provider;
  }

  public async start(): Promise<void> {
    this._lifecycle.start();
  }

  public async stop(): Promise<void> {
    this._lifecycle.transitionToStopping();
    this._acquisitionManager.evacuateAll(
      new LockStateError('Lock operations rejected: lock manager is shutting down', {
        state: 'STOPPING',
      }),
    );
    this._lifecycle.transitionToStopped();

    if (
      'clear' in this._provider &&
      typeof (this._provider as { clear: () => Promise<void> }).clear === 'function'
    ) {
      try {
        await (this._provider as { clear: () => Promise<void> }).clear();
      } catch {
        // safe cleanup
      }
    }
  }

  public lock(key: string): Lock {
    return new LockInstance(
      key,
      this._provider,
      this._acquisitionManager,
      this._lifecycle,
      this._diagnostics,
      this._defaultTtlMs,
      this._defaultTimeoutMs,
    );
  }

  public getDiagnostics(): LockDiagnosticsSnapshot {
    return this._diagnostics.getSnapshot();
  }

  public resetDiagnostics(): void {
    this._diagnostics.reset();
  }
}
