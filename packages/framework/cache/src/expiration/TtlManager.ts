import { CacheExpiration } from './CacheExpiration';

export class TtlManager {
  private readonly _defaultTtlMs?: number | undefined;

  constructor(defaultTtlMs?: number) {
    this._defaultTtlMs = CacheExpiration.validateTtl(defaultTtlMs);
  }

  public get defaultTtlMs(): number | undefined {
    return this._defaultTtlMs;
  }

  public resolveExpiresAt(optionsTtlMs?: number): number | undefined {
    const validated = CacheExpiration.validateTtl(optionsTtlMs);
    const effectiveTtl = validated !== undefined ? validated : this._defaultTtlMs;
    return CacheExpiration.calculateExpiresAt(effectiveTtl);
  }

  public isExpired(expiresAt?: number): boolean {
    return CacheExpiration.isExpired(expiresAt);
  }
}
