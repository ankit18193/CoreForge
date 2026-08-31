import type {
  HttpBindingDiagnosticsSnapshot,
  HttpValidationErrorDetail,
} from '@coreforge/contracts';

export class HttpBindingDiagnostics {
  private _totalBindings = 0;
  private _successfulBindings = 0;
  private _failedBindings = 0;
  private _missingValues = 0;
  private _typeFailures = 0;
  private _validationFailures = 0;
  private _transformationFailures = 0;
  private _activeBindings = 0;
  private _totalDurationMs = 0;
  private _slowestDurationMs = 0;

  public recordBindingStarted(): void {
    this._totalBindings++;
    this._activeBindings++;
  }

  public recordBindingSuccess(durationMs: number): void {
    this._activeBindings = Math.max(0, this._activeBindings - 1);
    this._successfulBindings++;
    this._totalDurationMs += durationMs;
    if (durationMs > this._slowestDurationMs) {
      this._slowestDurationMs = durationMs;
    }
  }

  public recordBindingFailure(
    durationMs: number,
    errors: readonly HttpValidationErrorDetail[] = [],
  ): void {
    this._activeBindings = Math.max(0, this._activeBindings - 1);
    this._failedBindings++;
    this._totalDurationMs += durationMs;
    if (durationMs > this._slowestDurationMs) {
      this._slowestDurationMs = durationMs;
    }

    for (const err of errors) {
      if (err.code === 'REQUIRED_FIELD_MISSING') {
        this._missingValues++;
      } else if (err.code === 'TYPE_TRANSFORMATION_FAILED' || err.code === 'CF-HTTP-BINDING-TYPE') {
        this._typeFailures++;
        this._transformationFailures++;
      } else {
        this._validationFailures++;
      }
    }
  }

  public getSnapshot(): HttpBindingDiagnosticsSnapshot {
    const completed = this._successfulBindings + this._failedBindings;
    const averageDurationMs = completed > 0 ? this._totalDurationMs / completed : 0;

    return Object.freeze({
      totalBindings: this._totalBindings,
      successfulBindings: this._successfulBindings,
      failedBindings: this._failedBindings,
      missingValues: this._missingValues,
      typeFailures: this._typeFailures,
      validationFailures: this._validationFailures,
      transformationFailures: this._transformationFailures,
      activeBindings: this._activeBindings,
      averageDurationMs,
      slowestDurationMs: this._slowestDurationMs,
    });
  }

  public reset(): void {
    this._totalBindings = 0;
    this._successfulBindings = 0;
    this._failedBindings = 0;
    this._missingValues = 0;
    this._typeFailures = 0;
    this._validationFailures = 0;
    this._transformationFailures = 0;
    this._activeBindings = 0;
    this._totalDurationMs = 0;
    this._slowestDurationMs = 0;
  }
}
