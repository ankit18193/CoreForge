import {
  ExecutionContextConfigurationError,
  ExecutionLimitError,
  ExecutionMetadataError,
} from '../errors/ExecutionContextErrors';
import { ExecutionMetadataConfig } from '../types/executionContextTypes';

const SENSITIVE_KEYS = new Set([
  'password',
  'secret',
  'token',
  'authorization',
  'cookie',
  'credential',
  'apikey',
  'privatekey',
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

export class MetadataSanitizer {
  private readonly _maxKeys: number;
  private readonly _maxDepth: number;
  private readonly _maxValueLength: number;

  constructor(config: ExecutionMetadataConfig = {}) {
    const maxKeys = config.maxKeys ?? 64;
    const maxDepth = config.maxDepth ?? 6;
    const maxValueLength = config.maxValueLength ?? 1024;

    if (maxKeys <= 0 || !Number.isFinite(maxKeys)) {
      throw new ExecutionContextConfigurationError('maxKeys must be a positive integer', {
        maxKeys,
      });
    }
    if (maxDepth <= 0 || !Number.isFinite(maxDepth)) {
      throw new ExecutionContextConfigurationError('maxDepth must be a positive integer', {
        maxDepth,
      });
    }
    if (maxValueLength <= 0 || !Number.isFinite(maxValueLength)) {
      throw new ExecutionContextConfigurationError('maxValueLength must be a positive integer', {
        maxValueLength,
      });
    }

    this._maxKeys = Math.floor(maxKeys);
    this._maxDepth = Math.floor(maxDepth);
    this._maxValueLength = Math.floor(maxValueLength);
  }

  public get maxKeys(): number {
    return this._maxKeys;
  }

  public get maxDepth(): number {
    return this._maxDepth;
  }

  public get maxValueLength(): number {
    return this._maxValueLength;
  }

  public validateKey(key: unknown): string {
    if (typeof key !== 'string') {
      throw new ExecutionMetadataError('Metadata key must be a string', { key });
    }

    const trimmed = key.trim();
    if (trimmed.length === 0) {
      throw new ExecutionMetadataError('Metadata key cannot be empty or whitespace-only', { key });
    }

    if (hasControlCharacters(trimmed)) {
      throw new ExecutionMetadataError('Metadata key contains invalid control characters', {
        key,
      });
    }

    return trimmed;
  }

  public sanitize(
    metadata: Readonly<Record<string, unknown>> | undefined,
  ): Readonly<Record<string, unknown>> {
    if (!metadata) {
      return Object.freeze({});
    }

    if (typeof metadata !== 'object' || Array.isArray(metadata)) {
      throw new ExecutionMetadataError('Metadata must be a plain object', { metadata });
    }

    const keys = Object.keys(metadata);
    if (keys.length > this._maxKeys) {
      throw new ExecutionLimitError(`Metadata exceeds maximum allowed keys (${this._maxKeys})`, {
        maxKeys: this._maxKeys,
        keyCount: keys.length,
      });
    }

    const result: Record<string, unknown> = {};
    const seen = new WeakSet<object>();

    for (const rawKey of keys) {
      const validKey = this.validateKey(rawKey);
      result[validKey] = this._sanitizeValue(validKey, metadata[rawKey], 1, seen);
    }

    return Object.freeze(result);
  }

  private _sanitizeValue(
    key: string,
    value: unknown,
    depth: number,
    seen: WeakSet<object>,
  ): unknown {
    if (depth > this._maxDepth) {
      throw new ExecutionLimitError(`Metadata exceeds maximum allowed depth (${this._maxDepth})`, {
        maxDepth: this._maxDepth,
        currentDepth: depth,
      });
    }

    if (isSensitiveKey(key)) {
      return '[REDACTED]';
    }

    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string') {
      if (value.length > this._maxValueLength) {
        return value.slice(0, this._maxValueLength) + '...';
      }
      return value;
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
          sanitizedArr.push(this._sanitizeValue(`${key}[${i}]`, value[i], depth + 1, seen));
        }
        return Object.freeze(sanitizedArr);
      }

      const sanitizedObj: Record<string, unknown> = {};
      const objKeys = Object.keys(value);
      for (const subKey of objKeys) {
        const validSubKey = this.validateKey(subKey);
        sanitizedObj[validSubKey] = this._sanitizeValue(
          validSubKey,
          (value as Record<string, unknown>)[subKey],
          depth + 1,
          seen,
        );
      }
      return Object.freeze(sanitizedObj);
    }

    return String(value);
  }
}
