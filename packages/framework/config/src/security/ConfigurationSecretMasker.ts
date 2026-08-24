export class ConfigurationSecretMasker {
  private static readonly SENSITIVE_PATTERNS: readonly RegExp[] = Object.freeze([
    /pass(word|wd)?/i,
    /secret/i,
    /token/i,
    /api[_-]?key/i,
    /auth(orization)?/i,
    /credential/i,
    /private[_-]?key/i,
    /access[_-]?key/i,
    /cert(ificate)?/i,
  ]);

  public static isSensitiveKey(key: string): boolean {
    if (!key || typeof key !== 'string') {
      return false;
    }
    return this.SENSITIVE_PATTERNS.some((pattern) => pattern.test(key));
  }

  public static mask(target: unknown, seen = new WeakSet<object>()): unknown {
    if (target === null || target === undefined) {
      return target;
    }

    if (typeof target !== 'object') {
      return target;
    }

    if (seen.has(target as object)) {
      return '[CIRCULAR]';
    }

    seen.add(target as object);

    if (Array.isArray(target)) {
      return Object.freeze(target.map((item) => this.mask(item, seen)));
    }

    const masked: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(target as Record<string, unknown>)) {
      if (this.isSensitiveKey(key)) {
        masked[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        masked[key] = this.mask(value, seen);
      } else {
        masked[key] = value;
      }
    }

    return Object.freeze(masked);
  }
}
