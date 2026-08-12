import { ConversionResult } from './ConversionResult';

export class EnumConverter {
  public convert(
    value: unknown,
    enumObj: Record<string, unknown>,
    targetType = 'enum',
  ): ConversionResult {
    const sourceType = typeof value;
    if (value === null || value === undefined) {
      return new ConversionResult({
        success: true,
        value: null,
        error: null,
        sourceType,
        targetType,
      });
    }

    const strVal = String(value);

    if (Object.values(enumObj).includes(strVal)) {
      return new ConversionResult({ success: true, value: strVal, error: null, sourceType, targetType });
    }

    const keyMatch = Object.keys(enumObj).find((k) => k.toUpperCase() === strVal.toUpperCase());
    if (keyMatch !== undefined) {
      return new ConversionResult({
        success: true,
        value: enumObj[keyMatch],
        error: null,
        sourceType,
        targetType,
      });
    }

    return new ConversionResult({
      success: false,
      value: null,
      error: new Error(`Value "${strVal}" is not valid for enum`),
      sourceType,
      targetType,
    });
  }
}
