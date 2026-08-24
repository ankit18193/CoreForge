export class LogSecretMasker {
  private static readonly DEFAULT_SENSITIVE_PATTERNS: readonly RegExp[] = Object.freeze([
    /pass(word|wd)?/i,
    /secret/i,
    /token/i,
    /api[_-]?key/i,
    /auth(orization)?/i,
    /cookie/i,
    /credential/i,
    /private[_-]?key/i,
    /access[_-]?key/i,
    /cert(ificate)?/i,
  ]);

  private readonly _patterns: readonly RegExp[];
  private readonly _maxDepth: number;

  constructor(customKeys: readonly string[] = [], maxDepth = 10) {
    const customPatterns = customKeys.map((k) => new RegExp(`^${k}$`, 'i'));
    this._patterns = Object.freeze([
      ...LogSecretMasker.DEFAULT_SENSITIVE_PATTERNS,
      ...customPatterns,
    ]);
    this._maxDepth = maxDepth;
  }

  public isSensitiveKey(key: string): boolean {
    if (!key || typeof key !== 'string') {
      return false;
    }
    return this._patterns.some((pattern) => pattern.test(key));
  }

  public mask(target: unknown, seen = new WeakSet<object>(), depth = 0): unknown {
    if (target === null || target === undefined) {
      return target;
    }

    if (typeof target !== 'object') {
      return target;
    }

    if (depth > this._maxDepth) {
      return '[MAX_DEPTH_EXCEEDED]';
    }

    if (seen.has(target as object)) {
      return '[Circular]';
    }

    seen.add(target as object);

    if (Array.isArray(target)) {
      return Object.freeze(target.map((item) => this.mask(item, seen, depth + 1)));
    }

    const masked: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(target as Record<string, unknown>)) {
      if (this.isSensitiveKey(key)) {
        masked[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        masked[key] = this.mask(value, seen, depth + 1);
      } else {
        masked[key] = value;
      }
    }

    return Object.freeze(masked);
  }
}
