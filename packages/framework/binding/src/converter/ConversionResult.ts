export class ConversionResult {
  public readonly success: boolean;
  public readonly value: unknown;
  public readonly error: unknown | null;
  public readonly sourceType: string;
  public readonly targetType: string;

  constructor(params: {
    success: boolean;
    value: unknown;
    error: unknown | null;
    sourceType: string;
    targetType: string;
  }) {
    this.success = params.success;
    this.value = params.value;
    this.error = params.error;
    this.sourceType = params.sourceType;
    this.targetType = params.targetType;
    Object.freeze(this);
  }
}
