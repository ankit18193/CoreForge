export class HttpSerializationProfiler {
  private _startBigInt: bigint = 0n;

  public start(): this {
    this._startBigInt = process.hrtime.bigint();
    return this;
  }

  public stop(): number {
    const elapsedNs = process.hrtime.bigint() - this._startBigInt;
    return Number(elapsedNs) / 1_000_000;
  }
}
