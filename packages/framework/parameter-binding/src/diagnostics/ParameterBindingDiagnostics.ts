import { ParameterBindingDiagnosticsSnapshot } from '../types/parameterBindingTypes';

export class ParameterBindingDiagnostics {
  private _totalBindings = 0;
  private _successfulBindings = 0;
  private _failedBindings = 0;
  private _missingRequiredValues = 0;
  private _sourceFailures = 0;
  private _totalDurationMs = 0;

  public recordBindingSuccess(durationMs: number): void {
    this._totalBindings++;
    this._successfulBindings++;
    this._totalDurationMs += durationMs;
  }

  public recordBindingFailure(
    durationMs: number,
    isMissingRequired = false,
    isSourceFailure = false,
  ): void {
    this._totalBindings++;
    this._failedBindings++;
    this._totalDurationMs += durationMs;
    if (isMissingRequired) {
      this._missingRequiredValues++;
    }
    if (isSourceFailure) {
      this._sourceFailures++;
    }
  }

  public snapshot(): ParameterBindingDiagnosticsSnapshot {
    const avg = this._totalBindings > 0 ? this._totalDurationMs / this._totalBindings : 0;

    const snap: ParameterBindingDiagnosticsSnapshot = {
      totalBindings: this._totalBindings,
      successfulBindings: this._successfulBindings,
      failedBindings: this._failedBindings,
      missingRequiredValues: this._missingRequiredValues,
      sourceFailures: this._sourceFailures,
      totalDurationMs: Number(this._totalDurationMs.toFixed(4)),
      averageDurationMs: Number(avg.toFixed(4)),
      timestamp: Date.now(),
    };

    return Object.freeze(snap);
  }
}
