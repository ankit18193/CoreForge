export interface StageProfilerTiming {
  stage: string;
  startTime: number;
  endTime?: number | undefined;
  duration?: number | undefined;
  success?: boolean | undefined;
}

export class StartupProfiler {
  private readonly _timings: StageProfilerTiming[] = [];
  private _totalStartTime = 0;
  private _totalEndTime = 0;

  public startTotal(): void {
    this._totalStartTime = Date.now();
  }

  public endTotal(): void {
    this._totalEndTime = Date.now();
  }

  public get totalStartTime(): number {
    return this._totalStartTime;
  }

  public get totalEndTime(): number {
    return this._totalEndTime;
  }

  public startStage(stage: string): void {
    this._timings.push({
      stage,
      startTime: Date.now(),
    });
  }

  public endStage(stage: string, success: boolean): void {
    const timing = this._timings.find((t) => t.stage === stage && t.endTime === undefined);
    if (timing) {
      timing.endTime = Date.now();
      timing.duration = timing.endTime - timing.startTime;
      timing.success = success;
    }
  }

  public getTimings(): readonly StageProfilerTiming[] {
    return this._timings;
  }

  public getStats() {
    const durations = this._timings
      .map((t) => t.duration)
      .filter((d): d is number => d !== undefined);

    const totalDuration = this._totalEndTime - this._totalStartTime;
    const averageStageDuration =
      durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    let slowestStage: string | undefined;
    let maxDuration = -1;
    for (const t of this._timings) {
      if (t.duration !== undefined && t.duration > maxDuration) {
        maxDuration = t.duration;
        slowestStage = t.stage;
      }
    }

    const failedStage = this._timings.find((t) => t.success === false)?.stage;
    const successfulStages = this._timings.filter((t) => t.success === true).map((t) => t.stage);

    return {
      totalStartupTime: totalDuration,
      slowestStage,
      averageStageDuration,
      failedStage,
      successfulStages,
    };
  }
}
