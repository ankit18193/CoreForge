import { ConversionResult } from './ConversionResult';

export class DateConverter {
  public convert(value: unknown, targetType = 'Date'): ConversionResult {
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

    if (value instanceof Date) {
      return new ConversionResult({ success: true, value, error: null, sourceType, targetType });
    }

    const strVal = String(value);
    const date = new Date(strVal);
    if (Number.isNaN(date.getTime()) || strVal.trim() === '') {
      return new ConversionResult({
        success: false,
        value: null,
        error: new Error(`Cannot convert "${strVal}" to Date`),
        sourceType,
        targetType,
      });
    }

    return new ConversionResult({ success: true, value: date, error: null, sourceType, targetType });
  }
}
