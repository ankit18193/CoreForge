export class InterceptorStatistics {
  private _totalInterceptions = 0;
  private _totalExecutions = 0;
  private _skippedInvocations = 0;
  private _exceptionCount = 0;
  private _slowestInterceptorDuration = 0;
  private _slowestInterceptorName = '';

  private _beforeDuration = 0;
  private _beforeCount = 0;

  private _afterDuration = 0;
  private _afterCount = 0;

  private readonly _executionCounts = new Map<string, number>();

  public recordInterception(): void {
    this._totalInterceptions++;
  }

  public recordExecution(name: string, durationMs: number): void {
    this._totalExecutions++;
    this._executionCounts.set(name, (this._executionCounts.get(name) || 0) + 1);

    if (durationMs > this._slowestInterceptorDuration) {
      this._slowestInterceptorDuration = durationMs;
      this._slowestInterceptorName = name;
    }
  }

  public recordBeforeDuration(durationMs: number): void {
    this._beforeCount++;
    this._beforeDuration += durationMs;
  }

  public recordAfterDuration(durationMs: number): void {
    this._afterCount++;
    this._afterDuration += durationMs;
  }

  public recordShortCircuit(): void {
    this._skippedInvocations++;
  }

  public recordException(): void {
    this._exceptionCount++;
  }

  public get totalInterceptions(): number {
    return this._totalInterceptions;
  }

  public get totalExecutions(): number {
    return this._totalExecutions;
  }

  public get skippedInvocations(): number {
    return this._skippedInvocations;
  }

  public get exceptionCount(): number {
    return this._exceptionCount;
  }

  public get averageBeforeDurationMs(): number {
    return this._beforeCount > 0 ? this._beforeDuration / this._beforeCount : 0;
  }

  public get averageAfterDurationMs(): number {
    return this._afterCount > 0 ? this._afterDuration / this._afterCount : 0;
  }

  public get slowestInterceptorDuration(): number {
    return this._slowestInterceptorDuration;
  }

  public get slowestInterceptorName(): string {
    return this._slowestInterceptorName;
  }

  public get executionCounts(): ReadonlyMap<string, number> {
    return this._executionCounts;
  }
}
