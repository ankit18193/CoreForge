export class KernelProfiler {
  private _startTime = 0;

  public start(): void {
    this._startTime = Date.now();
  }

  public get durationMs(): number {
    if (this._startTime === 0) {
      return 0;
    }
    return Date.now() - this._startTime;
  }
}
