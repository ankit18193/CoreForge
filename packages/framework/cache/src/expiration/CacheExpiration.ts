import { CacheExpirationError } from '../errors/CacheErrors';

export class CacheExpiration {
  public static validateTtl(ttlMs: unknown): number | undefined {
    if (ttlMs === undefined) {
      return undefined;
    }

    if (typeof ttlMs !== 'number' || !Number.isFinite(ttlMs) || Number.isNaN(ttlMs)) {
      throw new CacheExpirationError('TTL must be a positive finite number of milliseconds', {
        ttlMs,
      });
    }

    if (ttlMs <= 0) {
      throw new CacheExpirationError('TTL must be greater than 0 milliseconds', { ttlMs });
    }

    return ttlMs;
  }

  public static calculateExpiresAt(ttlMs?: number): number | undefined {
    if (ttlMs === undefined) {
      return undefined;
    }
    return Date.now() + ttlMs;
  }

  public static isExpired(expiresAt?: number): boolean {
    if (expiresAt === undefined) {
      return false;
    }
    return Date.now() >= expiresAt;
  }
}
