export class HttpControllerProfiler {
  private _startTime = 0;

  public start(): this {
    this._startTime = performance.now();
    return this;
  }

  public stop(): number {
    return performance.now() - this._startTime;
  }
}
