import { ConversionResult } from './ConversionResult';

export class ArrayConverter {
  public convert(
    value: unknown,
    itemConverter: (item: string) => ConversionResult,
    targetType = 'array',
  ): ConversionResult {
    const sourceType = typeof value;
    if (value === null || value === undefined) {
      return new ConversionResult({
        success: true,
        value: [],
        error: null,
        sourceType,
        targetType,
      });
    }

    let items: string[] = [];
    if (Array.isArray(value)) {
      items = value.map(String);
    } else {
      const strVal = String(value);
      items = strVal.split(',').map((s) => s.trim());
    }

    const converted: unknown[] = [];
    for (const item of items) {
      const res = itemConverter(item);
      if (!res.success) {
        return new ConversionResult({
          success: false,
          value: null,
          error: res.error,
          sourceType,
          targetType,
        });
      }
      converted.push(res.value);
    }

    return new ConversionResult({
      success: true,
      value: converted,
      error: null,
      sourceType,
      targetType,
    });
  }
}
