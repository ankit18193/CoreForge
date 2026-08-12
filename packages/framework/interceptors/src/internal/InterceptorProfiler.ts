export class InterceptorProfiler {
  private _beforeTime = 0;
  private _invokeTime = 0;
  private _afterTime = 0;
  private _totalTime = 0;

  public recordBefore(duration: number): void {
    this._beforeTime = duration;
  }

  public recordInvocation(duration: number): void {
    this._invokeTime = duration;
  }

  public recordAfter(duration: number): void {
    this._afterTime = duration;
  }

  public recordTotal(duration: number): void {
    this._totalTime = duration;
  }

  public get timings() {
    return {
      beforeDuration: this._beforeTime,
      invocationDuration: this._invokeTime,
      afterDuration: this._afterTime,
      totalTime: this._totalTime,
    };
  }
}
