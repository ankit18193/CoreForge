import type { HttpValueType } from '@coreforge/contracts';

import { HttpBindingTransformationError } from '../errors/HttpBindingErrors';

export class HttpValueTransformer {
  public static transform(
    value: unknown,
    targetType?: HttpValueType,
    fieldName = 'field',
  ): unknown {
    if (targetType === undefined || value === undefined || value === null) {
      return value;
    }

    switch (targetType) {
      case 'STRING':
        return HttpValueTransformer._toString(value, fieldName);

      case 'NUMBER':
        return HttpValueTransformer._toNumber(value, fieldName);

      case 'INTEGER':
        return HttpValueTransformer._toInteger(value, fieldName);

      case 'BOOLEAN':
        return HttpValueTransformer._toBoolean(value, fieldName);

      case 'JSON':
        return HttpValueTransformer._toJson(value, fieldName);

      case 'ARRAY':
        return HttpValueTransformer._toArray(value, fieldName);

      case 'OBJECT':
        return HttpValueTransformer._toObject(value, fieldName);

      default:
        return value;
    }
  }

  private static _toString(value: unknown, fieldName: string): string {
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
      return String(value);
    }
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        throw new HttpBindingTransformationError(fieldName, 'STRING');
      }
    }
    return String(value);
  }

  private static _toNumber(value: unknown, fieldName: string): number {
    if (typeof value === 'number') {
      if (Number.isNaN(value) || !Number.isFinite(value)) {
        throw new HttpBindingTransformationError(fieldName, 'NUMBER');
      }
      return value;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '') {
        throw new HttpBindingTransformationError(fieldName, 'NUMBER');
      }
      const num = Number(trimmed);
      if (Number.isNaN(num) || !Number.isFinite(num)) {
        throw new HttpBindingTransformationError(fieldName, 'NUMBER');
      }
      return num;
    }

    if (typeof value === 'boolean') {
      return value ? 1 : 0;
    }

    throw new HttpBindingTransformationError(fieldName, 'NUMBER');
  }

  private static _toInteger(value: unknown, fieldName: string): number {
    const num = HttpValueTransformer._toNumber(value, fieldName);
    if (!Number.isInteger(num)) {
      throw new HttpBindingTransformationError(fieldName, 'INTEGER');
    }
    return num;
  }

  private static _toBoolean(value: unknown, fieldName: string): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const lower = value.trim().toLowerCase();
      if (lower === 'true' || lower === '1' || lower === 'yes' || lower === 'on') {
        return true;
      }
      if (lower === 'false' || lower === '0' || lower === 'no' || lower === 'off') {
        return false;
      }
      throw new HttpBindingTransformationError(fieldName, 'BOOLEAN');
    }

    if (typeof value === 'number') {
      if (value === 1) {
        return true;
      }
      if (value === 0) {
        return false;
      }
      throw new HttpBindingTransformationError(fieldName, 'BOOLEAN');
    }

    throw new HttpBindingTransformationError(fieldName, 'BOOLEAN');
  }

  private static _toJson(value: unknown, fieldName: string): unknown {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        throw new HttpBindingTransformationError(fieldName, 'JSON');
      }
    }
    if (typeof value === 'object' && value !== null) {
      return value;
    }
    throw new HttpBindingTransformationError(fieldName, 'JSON');
  }

  private static _toArray(value: unknown, fieldName: string): readonly unknown[] {
    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            return parsed;
          }
        } catch {
          // Fallback to comma-separated
        }
      }
      if (trimmed === '') {
        return [];
      }
      return trimmed.split(',').map((s) => s.trim());
    }

    throw new HttpBindingTransformationError(fieldName, 'ARRAY');
  }

  private static _toObject(value: unknown, fieldName: string): Record<string, unknown> {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        throw new HttpBindingTransformationError(fieldName, 'OBJECT');
      }
    }

    throw new HttpBindingTransformationError(fieldName, 'OBJECT');
  }
}
