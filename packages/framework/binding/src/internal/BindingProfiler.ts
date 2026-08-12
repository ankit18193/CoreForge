export class BindingProfiler {
  private _extractionTime = 0;
  private _conversionTime = 0;
  private _validationTime = 0;
  private _totalTime = 0;

  public recordExtraction(duration: number): void {
    this._extractionTime += duration;
  }

  public recordConversion(duration: number): void {
    this._conversionTime += duration;
  }

  public recordValidation(duration: number): void {
    this._validationTime += duration;
  }

  public recordTotal(duration: number): void {
    this._totalTime += duration;
  }

  public get extractionTime(): number {
    return this._extractionTime;
  }

  public get conversionTime(): number {
    return this._conversionTime;
  }

  public get validationTime(): number {
    return this._validationTime;
  }

  public get totalTime(): number {
    return this._totalTime;
  }
}
