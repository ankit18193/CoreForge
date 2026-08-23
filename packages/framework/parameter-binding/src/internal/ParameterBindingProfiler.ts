export class ParameterBindingProfiler {
  private _startTime = 0;
  private _endTime = 0;
  private _running = false;

  public start(): void {
    this._startTime = performance.now();
    this._running = true;
  }

  public stop(): number {
    if (this._running) {
      this._endTime = performance.now();
      this._running = false;
    }
    return this.durationMs;
  }

  public get durationMs(): number {
    const end = this._running ? performance.now() : this._endTime;
    return Math.max(0, end - this._startTime);
  }
}
