import { Lock, LockAcquireOptions, LockLease, LockProvider } from '@coreforge/contracts';

import { LockAcquisitionManager } from '../acquisition/LockAcquisitionManager';
import { LockDiagnostics } from '../diagnostics/LockDiagnostics';
import {
  LockAcquisitionError,
  LockAcquisitionTimeoutError,
  LockCancellationError,
  LockOwnershipError,
  LockRenewalError,
} from '../errors/LockErrors';
import { LockProfiler } from '../internal/LockProfiler';
import { LockKey } from '../key/LockKey';
import { LockNamespace } from '../key/LockNamespace';
import { LockLeaseValidator } from '../lease/LockLeaseValidator';
import { LockLifecycleManager } from '../lifecycle/LockLifecycleManager';

export class LockInstance implements Lock {
  private readonly _key: string;
  private readonly _provider: LockProvider;
  private readonly _acquisitionManager: LockAcquisitionManager;
  private readonly _lifecycle: LockLifecycleManager;
  private readonly _diagnostics: LockDiagnostics;
  private readonly _defaultTtlMs?: number | undefined;
  private readonly _defaultTimeoutMs?: number | undefined;

  constructor(
    key: string,
    provider: LockProvider,
    acquisitionManager: LockAcquisitionManager,
    lifecycle: LockLifecycleManager,
    diagnostics: LockDiagnostics,
    defaultTtlMs?: number,
    defaultTimeoutMs?: number,
  ) {
    this._key = LockKey.validate(key);
    this._provider = provider;
    this._acquisitionManager = acquisitionManager;
    this._lifecycle = lifecycle;
    this._diagnostics = diagnostics;
    this._defaultTtlMs = defaultTtlMs;
    this._defaultTimeoutMs = defaultTimeoutMs;
  }

  public get key(): string {
    return this._key;
  }

  public async acquire(options: LockAcquireOptions): Promise<LockLease> {
    this._lifecycle.ensureOperational();
    this._diagnostics.recordAcquireAttempt();

    const profiler = new LockProfiler().start();
    const ttlMs = LockLeaseValidator.validateTtl(options.ttlMs ?? this._defaultTtlMs);
    const timeoutMs = options.timeoutMs ?? this._defaultTimeoutMs;

    // 1. Try immediate atomic acquisition
    const immediateLease = await this._provider.acquire(this._key, ttlMs);
    if (immediateLease) {
      this._diagnostics.recordSuccessfulAcquisition(profiler.elapsedMs);
      return immediateLease;
    }

    // 2. Lock is currently held - contention
    this._diagnostics.recordContention();

    // 3. If timeout configured, wait for lock
    if (timeoutMs !== undefined && timeoutMs > 0) {
      try {
        const waitedLease = await this._acquisitionManager.waitForLock(
          this._key,
          ttlMs,
          timeoutMs,
          options.signal,
        );
        this._diagnostics.recordSuccessfulAcquisition(profiler.elapsedMs);
        return waitedLease;
      } catch (err: unknown) {
        if (err instanceof LockAcquisitionTimeoutError) {
          this._diagnostics.recordTimeout(profiler.elapsedMs);
        } else if (err instanceof LockCancellationError) {
          this._diagnostics.recordCancellation();
        } else {
          this._diagnostics.recordFailedAcquisition(profiler.elapsedMs);
        }
        throw err;
      }
    }

    // No timeout configured, fail immediately
    this._diagnostics.recordFailedAcquisition(profiler.elapsedMs);
    throw new LockAcquisitionError(
      `Failed to acquire lock for key "${this._key}": lock is currently held by another lease`,
      { key: this._key },
    );
  }

  public async renew(lease: LockLease, ttlMs: number): Promise<LockLease> {
    this._lifecycle.ensureOperational();
    const validLease = LockLeaseValidator.validateLease(lease);
    const validTtl = LockLeaseValidator.validateTtl(ttlMs);

    if (validLease.key !== this._key) {
      this._diagnostics.recordRenewal(false);
      throw new LockOwnershipError(
        `Cannot renew lock lease: key mismatch (expected "${this._key}", got "${validLease.key}")`,
        { expectedKey: this._key, leaseKey: validLease.key },
      );
    }

    const renewed = await this._provider.renew(this._key, validLease.token, validTtl);
    if (!renewed) {
      this._diagnostics.recordRenewal(false);
      throw new LockRenewalError(
        `Failed to renew lock lease for key "${this._key}": lease expired or invalid token`,
        { key: this._key, token: validLease.token },
      );
    }

    this._diagnostics.recordRenewal(true);
    return renewed;
  }

  public async release(lease: LockLease): Promise<boolean> {
    this._lifecycle.ensureOperational();
    const validLease = LockLeaseValidator.validateLease(lease);

    if (validLease.key !== this._key) {
      this._diagnostics.recordRelease(false);
      throw new LockOwnershipError(
        `Cannot release lock lease: key mismatch (expected "${this._key}", got "${validLease.key}")`,
        { expectedKey: this._key, leaseKey: validLease.key },
      );
    }

    const released = await this._provider.release(this._key, validLease.token);
    this._diagnostics.recordRelease(released);

    if (released) {
      await this._acquisitionManager.notifyAvailable(this._key, this._provider);
    }

    return released;
  }

  public async isLocked(): Promise<boolean> {
    this._lifecycle.ensureOperational();
    return this._provider.isLocked(this._key);
  }

  public namespace(name: string): Lock {
    const composedKey = LockNamespace.composeKey(name, this._key);
    return new LockInstance(
      composedKey,
      this._provider,
      this._acquisitionManager,
      this._lifecycle,
      this._diagnostics,
      this._defaultTtlMs,
      this._defaultTimeoutMs,
    );
  }
}
