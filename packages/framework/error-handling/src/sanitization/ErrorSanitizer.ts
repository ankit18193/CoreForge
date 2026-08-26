const DEFAULT_SENSITIVE_PATTERNS = [
  'password',
  'secret',
  'token',
  'authorization',
  'cookie',
  'credential',
  'apikey',
  'privatekey',
  'bearer',
];

function isSensitiveKey(key: string, customPatterns?: readonly string[]): boolean {
  const lower = key.toLowerCase();
  const patterns = customPatterns ?? DEFAULT_SENSITIVE_PATTERNS;
  return patterns.some((pattern) => lower.includes(pattern.toLowerCase()));
}

export class ErrorSanitizer {
  public static sanitize<T>(
    value: T,
    seen = new WeakSet<object>(),
    customPatterns?: readonly string[],
  ): T {
    if (value === null || typeof value !== 'object') {
      return value;
    }

    if (seen.has(value as object)) {
      return '[Circular]' as unknown as T;
    }
    seen.add(value as object);

    if (value instanceof Date) {
      return new Date(value.getTime()) as unknown as T;
    }

    if (value instanceof RegExp) {
      return new RegExp(value.source, value.flags) as unknown as T;
    }

    if (Array.isArray(value)) {
      const sanitizedArray = value.map((item) => this.sanitize(item, seen, customPatterns));
      return Object.freeze(sanitizedArray) as unknown as T;
    }

    const copy: Record<string | symbol, unknown> = {};
    const propNames = Reflect.ownKeys(value as object);

    for (const prop of propNames) {
      const descriptor = Object.getOwnPropertyDescriptor(value as object, prop);
      if (descriptor && descriptor.enumerable) {
        const propStr = String(prop);
        if (isSensitiveKey(propStr, customPatterns)) {
          copy[prop] = '[REDACTED]';
        } else {
          const val = (value as Record<string | symbol, unknown>)[prop];
          copy[prop] = this.sanitize(val, seen, customPatterns);
        }
      }
    }

    return Object.freeze(copy) as T;
  }
}
