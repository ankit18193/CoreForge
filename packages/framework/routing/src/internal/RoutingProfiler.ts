export class RoutingProfiler {
  private readonly _startNs: bigint;

  constructor() {
    this._startNs = process.hrtime.bigint();
  }

  public stop(): number {
    const elapsedNs = process.hrtime.bigint() - this._startNs;
    return Number(elapsedNs) / 1_000_000;
  }
}
