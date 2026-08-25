import { SpanAttributeError } from '../errors/TracingErrors';
import { TraceLimitsManager } from '../limits/TraceLimitsManager';

const SENSITIVE_KEYS = new Set([
  'password',
  'secret',
  'token',
  'authorization',
  'cookie',
  'credential',
  'privatekey',
  'apikey',
  'bearer',
]);

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase().replace(/[-_]/g, '');
  for (const s of SENSITIVE_KEYS) {
    if (lower.includes(s)) {
      return true;
    }
  }
  return false;
}

function hasControlCharacters(str: string): boolean {
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if ((code >= 0 && code <= 31) || code === 127) {
      return true;
    }
  }
  return false;
}

export class SpanAttributes {
  private readonly _attributes = new Map<string, unknown>();
  private readonly _limits: TraceLimitsManager;

  constructor(limits: TraceLimitsManager) {
    this._limits = limits;
  }

  public set(key: unknown, value: unknown): void {
    const validKey = this._validateKey(key);

    if (!this._attributes.has(validKey)) {
      this._limits.assertAttributeLimit(this._attributes.size);
    }

    const sanitizedValue = this._sanitizeValue(validKey, value);
    this._attributes.set(validKey, sanitizedValue);
  }

  public setMultiple(attributes: Record<string, unknown>): void {
    if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes)) {
      throw new SpanAttributeError('Span attributes must be an object', { attributes });
    }

    for (const [k, v] of Object.entries(attributes)) {
      this.set(k, v);
    }
  }

  public getSnapshot(): Readonly<Record<string, unknown>> {
    const result: Record<string, unknown> = {};
    for (const [k, v] of this._attributes) {
      result[k] = v;
    }
    return Object.freeze(result);
  }

  private _validateKey(key: unknown): string {
    if (typeof key !== 'string') {
      throw new SpanAttributeError('Span attribute key must be a string', { key });
    }

    const trimmed = key.trim();
    if (trimmed.length === 0) {
      throw new SpanAttributeError('Span attribute key cannot be empty or whitespace-only', {
        key,
      });
    }

    if (hasControlCharacters(trimmed)) {
      throw new SpanAttributeError('Span attribute key contains invalid control characters', {
        key,
      });
    }

    return trimmed;
  }

  private _sanitizeValue(key: string, value: unknown, seen = new WeakSet<object>()): unknown {
    if (isSensitiveKey(key)) {
      return '[REDACTED]';
    }

    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string') {
      return this._limits.sanitizeAndTruncateValue(value);
    }

    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
      return value;
    }

    if (typeof value === 'function' || typeof value === 'symbol') {
      return String(value);
    }

    if (typeof value === 'object') {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);

      if (Array.isArray(value)) {
        const sanitizedArr: unknown[] = [];
        for (let i = 0; i < value.length; i++) {
          sanitizedArr.push(this._sanitizeValue(`${key}[${i}]`, value[i], seen));
        }
        return Object.freeze(sanitizedArr);
      }

      const sanitizedObj: Record<string, unknown> = {};
      for (const [subKey, subVal] of Object.entries(value)) {
        sanitizedObj[subKey] = this._sanitizeValue(subKey, subVal, seen);
      }
      return Object.freeze(sanitizedObj);
    }

    return String(value);
  }
}
