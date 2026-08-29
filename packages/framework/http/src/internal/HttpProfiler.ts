export class HttpProfiler {
  private _startTime: bigint | null = null;
  private _durationMs: number | null = null;

  public start(): this {
    this._startTime = process.hrtime.bigint();
    this._durationMs = null;
    return this;
  }

  public stop(): number {
    if (this._startTime === null) {
      return 0;
    }
    const endTime = process.hrtime.bigint();
    const diffNs = endTime - this._startTime;
    this._durationMs = Number(diffNs) / 1_000_000;
    return Math.round(this._durationMs * 100) / 100;
  }

  public get elapsedMs(): number {
    if (this._startTime === null) {
      return 0;
    }
    const current = process.hrtime.bigint();
    const diffNs = current - this._startTime;
    return Math.round((Number(diffNs) / 1_000_000) * 100) / 100;
  }

  public get durationMs(): number {
    return this._durationMs ?? this.elapsedMs;
  }
}
