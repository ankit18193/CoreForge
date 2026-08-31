export class HttpMiddlewareProfiler {
  private _startTimeBigInt: bigint = 0n;

  public start(): this {
    this._startTimeBigInt = process.hrtime.bigint();
    return this;
  }

  public stop(): number {
    if (this._startTimeBigInt === 0n) {
      return 0;
    }
    const elapsedNanos = process.hrtime.bigint() - this._startTimeBigInt;
    return Number(elapsedNanos) / 1_000_000;
  }

  public get elapsedMs(): number {
    if (this._startTimeBigInt === 0n) {
      return 0;
    }
    const elapsedNanos = process.hrtime.bigint() - this._startTimeBigInt;
    return Number(elapsedNanos) / 1_000_000;
  }
}
