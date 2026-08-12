export interface ProfilerRecord {
  readonly descriptorId: string;
  readonly duration: number;
}

export class MiddlewareProfiler {
  private readonly _records: ProfilerRecord[] = [];
  private _totalCalls = 0;
  private _terminatedCount = 0;
  private _exceptionsCount = 0;
  private _skippedCount = 0;
  private _maxPipelineDepth = 0;
  private _totalPipelineDepth = 0;
  private _pipelineInvocations = 0;

  public recordPipelineRun(depth: number): void {
    this._pipelineInvocations++;
    this._totalPipelineDepth += depth;
    if (depth > this._maxPipelineDepth) {
      this._maxPipelineDepth = depth;
    }
  }

  public recordExecution(descriptorId: string, durationMs: number): void {
    this._totalCalls++;
    this._records.push({ descriptorId, duration: durationMs });
  }

  public recordException(): void {
    this._exceptionsCount++;
  }

  public recordTermination(): void {
    this._terminatedCount++;
  }

  public recordSkip(count = 1): void {
    this._skippedCount += count;
  }

  public get totalCalls(): number {
    return this._totalCalls;
  }

  public get records(): readonly ProfilerRecord[] {
    return Object.freeze([...this._records]);
  }

  public get terminatedCount(): number {
    return this._terminatedCount;
  }

  public get exceptionsCount(): number {
    return this._exceptionsCount;
  }

  public get skippedCount(): number {
    return this._skippedCount;
  }

  public get averagePipelineDepth(): number {
    return this._pipelineInvocations > 0 ? this._totalPipelineDepth / this._pipelineInvocations : 0;
  }
}
