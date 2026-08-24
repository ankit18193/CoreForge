import { ConfigurationSource } from '../types/configurationTypes';

export interface EnvironmentVariableSourceOptions {
  readonly prefix?: string | undefined;
  readonly env?: Record<string, string | undefined> | undefined;
  readonly name?: string | undefined;
  readonly mapping?: Record<string, string> | undefined;
}

export class EnvironmentVariableSource implements ConfigurationSource {
  public readonly name: string;
  private readonly _prefix?: string | undefined;
  private readonly _env: Record<string, string | undefined>;
  private readonly _mapping?: Record<string, string> | undefined;

  constructor(optionsOrMapping: EnvironmentVariableSourceOptions | Record<string, string> = {}) {
    if (
      'prefix' in optionsOrMapping ||
      'env' in optionsOrMapping ||
      'name' in optionsOrMapping ||
      'mapping' in optionsOrMapping
    ) {
      const opts = optionsOrMapping as EnvironmentVariableSourceOptions;
      this.name = opts.name || 'EnvironmentVariableSource';
      this._prefix = opts.prefix !== undefined ? opts.prefix : 'COREFORGE_';
      this._env = opts.env || (typeof process !== 'undefined' ? process.env : {});
      this._mapping = opts.mapping;
    } else {
      this.name = 'EnvironmentVariableSource';
      this._env = typeof process !== 'undefined' ? process.env : {};
      this._mapping = optionsOrMapping as Record<string, string>;
      this._prefix = undefined;
    }
  }

  public load(): Readonly<Record<string, unknown>> {
    const result: Record<string, unknown> = {};

    // 1. If mapping dictionary is provided:
    if (this._mapping) {
      for (const [configPath, envVarName] of Object.entries(this._mapping)) {
        const rawVal = this._env[envVarName];
        if (rawVal !== undefined && rawVal !== null) {
          const coerced = this._coerceValue(rawVal);
          this._setByDotPath(result, configPath, coerced);
        }
      }
    }

    // 2. If prefix is configured (e.g. 'COREFORGE_'):
    if (this._prefix !== undefined) {
      for (const [rawKey, rawValue] of Object.entries(this._env)) {
        if (rawValue === undefined || rawValue === null) {
          continue;
        }

        if (this._prefix && !rawKey.startsWith(this._prefix)) {
          continue;
        }

        const keyWithoutPrefix = this._prefix ? rawKey.substring(this._prefix.length) : rawKey;

        if (keyWithoutPrefix.length === 0) {
          continue;
        }

        const coercedValue = this._coerceValue(rawValue);
        this._setNestedProperty(result, keyWithoutPrefix, coercedValue);
      }
    }

    return Object.freeze(result);
  }

  private _coerceValue(val: string): unknown {
    const trimmed = val.trim();
    if (trimmed.toLowerCase() === 'true') {
      return true;
    }
    if (trimmed.toLowerCase() === 'false') {
      return false;
    }
    if (trimmed.toLowerCase() === 'null') {
      return null;
    }
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      const num = Number(trimmed);
      if (!Number.isNaN(num)) {
        return num;
      }
    }
    return val;
  }

  private _setNestedProperty(
    target: Record<string, unknown>,
    rawKey: string,
    value: unknown,
  ): void {
    // Handle double underscore __ as primary nesting delimiter, or fallback to single _
    let segments: string[];
    if (rawKey.includes('__')) {
      segments = rawKey.split('__').map((seg) => this._toCamelCase(seg));
    } else if (rawKey.includes('_')) {
      // First segment is root, remaining segments convert to camelCase
      const parts = rawKey.split('_');
      if (parts.length === 2) {
        segments = [this._toCamelCase(parts[0]), this._toCamelCase(parts[1])];
      } else {
        // e.g. DATABASE_POOL_SIZE -> ['database', 'poolSize']
        segments = [this._toCamelCase(parts[0]), this._toCamelCase(parts.slice(1).join('_'))];
      }
    } else {
      segments = [this._toCamelCase(rawKey)];
    }

    let current = target;
    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i];
      if (!current[seg] || typeof current[seg] !== 'object' || Array.isArray(current[seg])) {
        current[seg] = {};
      }
      current = current[seg] as Record<string, unknown>;
    }

    const lastSeg = segments[segments.length - 1];
    current[lastSeg] = value;
  }

  private _toCamelCase(str: string): string {
    const parts = str.toLowerCase().split('_');
    if (parts.length <= 1) {
      return parts[0] || '';
    }
    return (
      parts[0] +
      parts
        .slice(1)
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join('')
    );
  }

  private _setByDotPath(target: Record<string, unknown>, dotPath: string, value: unknown): void {
    const segments = dotPath.split('.');
    let current = target;

    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i];
      if (!current[seg] || typeof current[seg] !== 'object' || Array.isArray(current[seg])) {
        current[seg] = {};
      }
      current = current[seg] as Record<string, unknown>;
    }

    const last = segments[segments.length - 1];
    current[last] = value;
  }
}
