export class JobProfiler {
  private _startTime: bigint = 0n;

  public start(): this {
    this._startTime = process.hrtime.bigint();
    return this;
  }

  public get elapsedMs(): number {
    if (this._startTime === 0n) {
      return 0;
    }
    const diff = process.hrtime.bigint() - this._startTime;
    return Number(diff) / 1_000_000;
  }
}
