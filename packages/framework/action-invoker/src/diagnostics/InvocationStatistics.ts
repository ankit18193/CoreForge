export class InvocationStatistics {
  private _totalInvocations = 0;
  private _successfulInvocations = 0;
  private _failedInvocations = 0;
  private _totalExecutionTime = 0;
  private _slowestActionName = '';
  private _slowestActionDuration = 0;
  private readonly _controllerCounts = new Map<string, number>();
  private readonly _actionCounts = new Map<string, number>();

  public recordInvocation(controllerName: string, actionName: string): void {
    this._totalInvocations++;
    this._controllerCounts.set(
      controllerName,
      (this._controllerCounts.get(controllerName) || 0) + 1,
    );
    this._actionCounts.set(actionName, (this._actionCounts.get(actionName) || 0) + 1);
  }

  public recordSuccess(durationMs: number, controllerName: string, actionName: string): void {
    this._successfulInvocations++;
    this._totalExecutionTime += durationMs;

    if (durationMs > this._slowestActionDuration) {
      this._slowestActionDuration = durationMs;
      this._slowestActionName = `${controllerName}.${actionName}`;
    }
  }

  public recordFailure(): void {
    this._failedInvocations++;
  }

  public get totalInvocations(): number {
    return this._totalInvocations;
  }

  public get successfulInvocations(): number {
    return this._successfulInvocations;
  }

  public get failedInvocations(): number {
    return this._failedInvocations;
  }

  public get averageExecutionTime(): number {
    return this._successfulInvocations > 0 ? this._totalExecutionTime / this._successfulInvocations : 0;
  }

  public get slowestActionName(): string {
    return this._slowestActionName;
  }

  public get slowestActionDuration(): number {
    return this._slowestActionDuration;
  }

  public get controllerCounts(): ReadonlyMap<string, number> {
    return this._controllerCounts;
  }

  public get actionCounts(): ReadonlyMap<string, number> {
    return this._actionCounts;
  }
}
