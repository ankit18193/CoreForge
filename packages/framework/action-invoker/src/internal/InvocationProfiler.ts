export class InvocationProfiler {
  private readonly _start = Date.now();
  private _controllerResolutionTime = 0;
  private _actionResolutionTime = 0;
  private _executionTime = 0;
  private _normalizationTime = 0;

  public recordControllerResolution(duration: number): void {
    this._controllerResolutionTime = duration;
  }

  public recordActionResolution(duration: number): void {
    this._actionResolutionTime = duration;
  }

  public recordExecution(duration: number): void {
    this._executionTime = duration;
  }

  public recordNormalization(duration: number): void {
    this._normalizationTime = duration;
  }

  public get totalTime(): number {
    return Date.now() - this._start;
  }

  public get timings() {
    return {
      controllerResolutionTime: this._controllerResolutionTime,
      actionResolutionTime: this._actionResolutionTime,
      executionTime: this._executionTime,
      normalizationTime: this._normalizationTime,
      totalTime: this.totalTime,
    };
  }
}
