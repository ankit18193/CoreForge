import { ConversionResult } from './ConversionResult';

export class PrimitiveConverter {
  public convert(value: unknown, targetType: string): ConversionResult {
    const sourceType = typeof value;
    if (value === null || value === undefined) {
      return new ConversionResult({ success: true, value, error: null, sourceType, targetType });
    }

    const strVal = String(value);

    if (targetType === 'string') {
      return new ConversionResult({
        success: true,
        value: strVal,
        error: null,
        sourceType,
        targetType,
      });
    }

    if (targetType === 'number') {
      const num = Number(strVal);
      if (Number.isNaN(num) || strVal.trim() === '') {
        return new ConversionResult({
          success: false,
          value: null,
          error: new Error(`Cannot convert "${strVal}" to number`),
          sourceType,
          targetType,
        });
      }
      return new ConversionResult({ success: true, value: num, error: null, sourceType, targetType });
    }

    if (targetType === 'boolean') {
      if (strVal.toLowerCase() === 'true' || strVal === '1') {
        return new ConversionResult({
          success: true,
          value: true,
          error: null,
          sourceType,
          targetType,
        });
      }
      if (strVal.toLowerCase() === 'false' || strVal === '0') {
        return new ConversionResult({
          success: true,
          value: false,
          error: null,
          sourceType,
          targetType,
        });
      }
      return new ConversionResult({
        success: false,
        value: null,
        error: new Error(`Cannot convert "${strVal}" to boolean`),
        sourceType,
        targetType,
      });
    }

    return new ConversionResult({
      success: false,
      value: null,
      error: new Error(`Unsupported target type "${targetType}" for primitive conversion`),
      sourceType,
      targetType,
    });
  }
}
