export interface StageTiming {
  readonly stageName: string;
  readonly start: number;
  readonly end: number;
  readonly duration: number;
  readonly exceptionThrown: boolean;
}

export class RequestProfiler {
  private readonly _stagesTimings: StageTiming[] = [];
  private _totalRequests = 0;
  private _completedRequests = 0;
  private _failedRequests = 0;
  private _cancelledRequests = 0;
  private _slowestDuration = 0;
  private readonly _durations: number[] = [];

  public startRequest(): void {
    this._totalRequests++;
  }

  public recordStage(stageName: string, durationMs: number, exceptionThrown: boolean): void {
    const end = Date.now();
    const start = end - durationMs;
    this._stagesTimings.push({
      stageName,
      start,
      end,
      duration: durationMs,
      exceptionThrown,
    });
  }

  public completeRequest(durationMs: number): void {
    this._completedRequests++;
    this._durations.push(durationMs);
    if (durationMs > this._slowestDuration) {
      this._slowestDuration = durationMs;
    }
  }

  public failRequest(): void {
    this._failedRequests++;
  }

  public cancelRequest(): void {
    this._cancelledRequests++;
  }

  public get totalRequests(): number {
    return this._totalRequests;
  }

  public get completedRequests(): number {
    return this._completedRequests;
  }

  public get failedRequests(): number {
    return this._failedRequests;
  }

  public get cancelledRequests(): number {
    return this._cancelledRequests;
  }

  public get slowestDuration(): number {
    return this._slowestDuration;
  }

  public get averageDuration(): number {
    if (this._durations.length === 0) {
      return 0;
    }
    const sum = this._durations.reduce((a, b) => a + b, 0);
    return sum / this._durations.length;
  }

  public get percentile95(): number {
    if (this._durations.length === 0) {
      return 0;
    }
    const sorted = [...this._durations].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * 0.95) - 1;
    return sorted[index] || 0;
  }

  public getStageDuration(stageName: string): number {
    const list = this._stagesTimings.filter((t) => t.stageName === stageName);
    if (list.length === 0) {
      return 0;
    }
    return list.reduce((sum, current) => sum + current.duration, 0) / list.length;
  }

  public getStageTimings(): readonly StageTiming[] {
    return Object.freeze([...this._stagesTimings]);
  }
}
