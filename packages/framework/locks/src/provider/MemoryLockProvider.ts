import { randomUUID } from 'node:crypto';

import { LockLease, LockProvider } from '@coreforge/contracts';

import { LockKey } from '../key/LockKey';
import { LockLeaseValidator } from '../lease/LockLeaseValidator';

export class MemoryLockProvider implements LockProvider {
  private readonly _leases = new Map<string, LockLease>();

  public async acquire(key: string, ttlMs: number): Promise<LockLease | undefined> {
    const validKey = LockKey.validate(key);
    const validTtl = LockLeaseValidator.validateTtl(ttlMs);

    const existing = this._leases.get(validKey);
    if (existing) {
      if (!LockLeaseValidator.isExpired(existing)) {
        return undefined; // Still actively locked
      }
      // Reclaim expired lease
      this._leases.delete(validKey);
    }

    const now = Date.now();
    const lease: LockLease = Object.freeze({
      key: validKey,
      token: randomUUID(),
      acquiredAt: now,
      expiresAt: now + validTtl,
    });

    this._leases.set(validKey, lease);
    return lease;
  }

  public async renew(key: string, token: string, ttlMs: number): Promise<LockLease | undefined> {
    const validKey = LockKey.validate(key);
    const validTtl = LockLeaseValidator.validateTtl(ttlMs);

    const existing = this._leases.get(validKey);
    if (!existing) {
      return undefined;
    }

    if (existing.token !== token) {
      return undefined; // Invalid owner token
    }

    if (LockLeaseValidator.isExpired(existing)) {
      this._leases.delete(validKey);
      return undefined; // Expired lease cannot be renewed
    }

    const now = Date.now();
    const renewed: LockLease = Object.freeze({
      key: validKey,
      token: existing.token,
      acquiredAt: existing.acquiredAt,
      expiresAt: now + validTtl,
    });

    this._leases.set(validKey, renewed);
    return renewed;
  }

  public async release(key: string, token: string): Promise<boolean> {
    const validKey = LockKey.validate(key);

    const existing = this._leases.get(validKey);
    if (!existing) {
      return false;
    }

    if (existing.token !== token) {
      return false; // Wrong token cannot release another owner's lock
    }

    this._leases.delete(validKey);
    return true;
  }

  public async isLocked(key: string): Promise<boolean> {
    const validKey = LockKey.validate(key);

    const existing = this._leases.get(validKey);
    if (!existing) {
      return false;
    }

    if (LockLeaseValidator.isExpired(existing)) {
      this._leases.delete(validKey);
      return false;
    }

    return true;
  }

  public async clear(): Promise<void> {
    this._leases.clear();
  }
}
