import { ConversionResult } from './ConversionResult';

export class BigIntConverter {
  public convert(value: unknown, targetType = 'bigint'): ConversionResult {
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
    try {
      const bigint = BigInt(strVal);
      return new ConversionResult({
        success: true,
        value: bigint,
        error: null,
        sourceType,
        targetType,
      });
    } catch {
      return new ConversionResult({
        success: false,
        value: null,
        error: new Error(`Cannot convert "${strVal}" to bigint`),
        sourceType,
        targetType,
      });
    }
  }
}
