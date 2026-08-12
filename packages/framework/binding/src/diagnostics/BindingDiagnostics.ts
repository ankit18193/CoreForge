export interface BindingDiagnosticsSnapshot {
  readonly totalBindings: number;
  readonly successfulBindings: number;
  readonly failedBindings: number;
  readonly extractionFailures: number;
  readonly conversionFailures: number;
  readonly validationFailures: number;
  readonly rejectedRequests: number;
  readonly averageBindDuration: number;
  readonly averageConversionTime: number;
  readonly averageValidationTime: number;
}

export class BindingDiagnostics {
  private _totalBindings = 0;
  private _successfulBindings = 0;
  private _failedBindings = 0;
  private _extractionFailures = 0;
  private _conversionFailures = 0;
  private _validationFailures = 0;
  private _rejectedRequests = 0;

  private _totalDuration = 0;
  private _totalConversionDuration = 0;
  private _totalValidationDuration = 0;

  public recordBinding(
    success: boolean,
    duration: number,
    conversionDur: number,
    validationDur: number,
  ): void {
    this._totalBindings++;
    this._totalDuration += duration;
    this._totalConversionDuration += conversionDur;
    this._totalValidationDuration += validationDur;

    if (success) {
      this._successfulBindings++;
    } else {
      this._failedBindings++;
    }
  }

  public recordExtractionFailure(): void {
    this._extractionFailures++;
    this._rejectedRequests++;
  }

  public recordConversionFailure(): void {
    this._conversionFailures++;
    this._rejectedRequests++;
  }

  public recordValidationFailure(): void {
    this._validationFailures++;
    this._rejectedRequests++;
  }

  public getSnapshot(): BindingDiagnosticsSnapshot {
    const avgBind = this._totalBindings > 0 ? this._totalDuration / this._totalBindings : 0;
    const avgConv =
      this._totalBindings > 0 ? this._totalConversionDuration / this._totalBindings : 0;
    const avgVal =
      this._totalBindings > 0 ? this._totalValidationDuration / this._totalBindings : 0;

    return {
      totalBindings: this._totalBindings,
      successfulBindings: this._successfulBindings,
      failedBindings: this._failedBindings,
      extractionFailures: this._extractionFailures,
      conversionFailures: this._conversionFailures,
      validationFailures: this._validationFailures,
      rejectedRequests: this._rejectedRequests,
      averageBindDuration: avgBind,
      averageConversionTime: avgConv,
      averageValidationTime: avgVal,
    };
  }
}
