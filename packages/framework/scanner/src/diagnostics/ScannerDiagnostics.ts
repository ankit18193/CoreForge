export interface ScannerDiagnosticsSnapshot {
  readonly scanDurationMs: number;
  readonly planningDurationMs: number;
  readonly registrationGraphSize: number;
  readonly graphDepth: number;
  readonly registrationStages: number;
  readonly validationFailures: number;
  readonly duplicateRegistrations: number;
  readonly registrationOrderingConflicts: number;
}

export class ScannerDiagnostics {
  private _scanTimeMs = 0;
  private _planningTimeMs = 0;
  private _graphSize = 0;
  private _graphDepth = 0;
  private _stages = 0;
  private _validationFailures = 0;
  private _duplicateRegistrations = 0;
  private _orderingConflicts = 0;

  public recordTimings(scan: number, planning: number): void {
    this._scanTimeMs = scan;
    this._planningTimeMs = planning;
  }

  public recordGraphMetrics(size: number, depth: number): void {
    this._graphSize = size;
    this._graphDepth = depth;
  }

  public recordStages(stages: number): void {
    this._stages = stages;
  }

  public recordFailure(): void {
    this._validationFailures++;
  }

  public recordDuplicateAttempt(): void {
    this._duplicateRegistrations++;
  }

  public recordOrderingConflict(): void {
    this._orderingConflicts++;
  }

  public getSnapshot(): ScannerDiagnosticsSnapshot {
    return {
      scanDurationMs: this._scanTimeMs,
      planningDurationMs: this._planningTimeMs,
      registrationGraphSize: this._graphSize,
      graphDepth: this._graphDepth,
      registrationStages: this._stages,
      validationFailures: this._validationFailures,
      duplicateRegistrations: this._duplicateRegistrations,
      registrationOrderingConflicts: this._orderingConflicts,
    };
  }
}
