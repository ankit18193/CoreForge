const SENSITIVE_KEY_PATTERNS = [
  'password',
  'token',
  'secret',
  'authorization',
  'cookie',
  'apikey',
  'access_token',
  'refresh_token',
  'private_key',
  'privatekey',
  'credential',
  'credentials',
  'conn_str',
  'connectionstring',
];

export class HttpErrorSanitizer {
  public static sanitizeString(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    return input
      .replace(/(bearer\s+)[a-zA-Z0-9_\-.]+/gi, '$1[REDACTED]')
      .replace(/(password\s*[:=]\s*)[^\s&;,"]+/gi, '$1[REDACTED]')
      .replace(/(token\s*[:=]\s*)[^\s&;,"]+/gi, '$1[REDACTED]')
      .replace(/(secret\s*[:=]\s*)[^\s&;,"]+/gi, '$1[REDACTED]')
      .replace(/(apikey\s*[:=]\s*)[^\s&;,"]+/gi, '$1[REDACTED]')
      .replace(
        /(postgres|postgresql|mongodb|mongodb\+srv|mysql|redis|rediss|amqp|amqps):\/\/[^\s"']+/gi,
        '$1://[REDACTED]',
      )
      .replace(/([a-zA-Z]:\\[^\s"']+)/g, '[PATH_REDACTED]')
      .replace(/(\/(?:home|etc|usr|var|tmp|Users|app|src)\/[^\s"']+)/g, '[PATH_REDACTED]');
  }

  public static isSensitiveKey(key: string, extraSensitiveKeys: readonly string[] = []): boolean {
    const lower = key.toLowerCase();
    if (SENSITIVE_KEY_PATTERNS.some((p) => lower.includes(p))) {
      return true;
    }
    return extraSensitiveKeys.some(
      (k) => lower === k.toLowerCase() || lower.includes(k.toLowerCase()),
    );
  }

  public static sanitizeDetails<T = unknown>(
    details: T,
    extraSensitiveKeys: readonly string[] = [],
    seen = new WeakSet<object>(),
  ): T {
    if (details === null || typeof details !== 'object') {
      if (typeof details === 'string') {
        return this.sanitizeString(details) as unknown as T;
      }
      return details;
    }

    if (seen.has(details as object)) {
      return '[Circular]' as unknown as T;
    }
    seen.add(details as object);

    if (Array.isArray(details)) {
      return details.map((item) =>
        this.sanitizeDetails(item, extraSensitiveKeys, seen),
      ) as unknown as T;
    }

    const copy: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(details)) {
      if (this.isSensitiveKey(key, extraSensitiveKeys)) {
        copy[key] = '[REDACTED]';
      } else {
        copy[key] = this.sanitizeDetails(value, extraSensitiveKeys, seen);
      }
    }

    return copy as unknown as T;
  }
}
