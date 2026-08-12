import { ArrayConverter } from './ArrayConverter';
import { BigIntConverter } from './BigIntConverter';
import { ConversionResult } from './ConversionResult';
import { DateConverter } from './DateConverter';
import { EnumConverter } from './EnumConverter';
import { PrimitiveConverter } from './PrimitiveConverter';

export interface CustomConverter {
  convert(value: unknown, targetType: string): ConversionResult;
}

export class TypeConverter {
  private readonly _primitive = new PrimitiveConverter();
  private readonly _date = new DateConverter();
  private readonly _enum = new EnumConverter();
  private readonly _array = new ArrayConverter();
  private readonly _bigint = new BigIntConverter();

  private readonly _customConverters = new Map<string, CustomConverter>();

  public register(type: string, converter: CustomConverter): void {
    this._customConverters.set(type.toLowerCase(), converter);
  }

  public convert(
    value: unknown,
    targetType: string,
    enumObj?: Record<string, unknown> | undefined,
  ): ConversionResult {
    const typeLower = targetType.toLowerCase();

    const custom = this._customConverters.get(typeLower);
    if (custom) {
      return custom.convert(value, targetType);
    }

    if (typeLower === 'string' || typeLower === 'number' || typeLower === 'boolean') {
      return this._primitive.convert(value, typeLower);
    }

    if (typeLower === 'date') {
      return this._date.convert(value);
    }

    if (typeLower === 'bigint') {
      return this._bigint.convert(value);
    }

    if (typeLower === 'enum' && enumObj) {
      return this._enum.convert(value, enumObj);
    }

    if (targetType.endsWith('[]')) {
      const itemType = targetType.slice(0, -2);
      return this._array.convert(value, (item) => this.convert(item, itemType));
    }

    return new ConversionResult({
      success: false,
      value: null,
      error: new Error(`No converter registered for target type "${targetType}"`),
      sourceType: typeof value,
      targetType,
    });
  }
}
