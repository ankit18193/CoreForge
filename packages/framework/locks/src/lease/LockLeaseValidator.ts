import { LockLease } from '@coreforge/contracts';

import { LockConfigurationError, LockOwnershipError } from '../errors/LockErrors';

export class LockLeaseValidator {
  public static validateTtl(ttlMs: unknown): number {
    if (typeof ttlMs !== 'number' || !Number.isFinite(ttlMs) || ttlMs <= 0) {
      throw new LockConfigurationError('Lock TTL must be a positive finite number (> 0)', {
        ttlMs,
      });
    }
    return ttlMs;
  }

  public static validateLease(lease: unknown): LockLease {
    if (!lease || typeof lease !== 'object') {
      throw new LockOwnershipError('Invalid lock lease: lease must be an object', { lease });
    }

    const l = lease as Partial<LockLease>;
    if (typeof l.key !== 'string' || l.key.trim().length === 0) {
      throw new LockOwnershipError('Invalid lock lease: key must be a non-empty string', { lease });
    }

    if (typeof l.token !== 'string' || l.token.trim().length === 0) {
      throw new LockOwnershipError('Invalid lock lease: token must be a non-empty string', {
        lease,
      });
    }

    if (typeof l.acquiredAt !== 'number' || !Number.isFinite(l.acquiredAt)) {
      throw new LockOwnershipError('Invalid lock lease: acquiredAt must be a valid number', {
        lease,
      });
    }

    if (typeof l.expiresAt !== 'number' || !Number.isFinite(l.expiresAt)) {
      throw new LockOwnershipError('Invalid lock lease: expiresAt must be a valid number', {
        lease,
      });
    }

    return Object.freeze({
      key: l.key.trim(),
      token: l.token.trim(),
      acquiredAt: l.acquiredAt,
      expiresAt: l.expiresAt,
    });
  }

  public static isExpired(lease: LockLease, now = Date.now()): boolean {
    return lease.expiresAt <= now;
  }
}
