export interface ActionProfilerRecord {
  readonly controllerId: string;
  readonly actionName: string;
  readonly duration: number;
}

export class ActionProfiler {
  private readonly _records: ActionProfilerRecord[] = [];
  private _totalInvocations = 0;
  private _failedCount = 0;
  private _successCount = 0;

  public recordExecution(
    controllerId: string,
    actionName: string,
    durationMs: number,
    success: boolean,
  ): void {
    this._totalInvocations++;
    if (success) {
      this._successCount++;
    } else {
      this._failedCount++;
    }
    this._records.push({ controllerId, actionName, duration: durationMs });
  }

  public get totalInvocations(): number {
    return this._totalInvocations;
  }

  public get successCount(): number {
    return this._successCount;
  }

  public get failedCount(): number {
    return this._failedCount;
  }

  public get records(): readonly ActionProfilerRecord[] {
    return Object.freeze([...this._records]);
  }
}
