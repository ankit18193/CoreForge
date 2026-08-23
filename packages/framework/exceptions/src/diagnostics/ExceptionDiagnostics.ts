import { ErrorCategory, ExceptionDiagnosticsSnapshot } from '../types/exceptionTypes';

export class ExceptionDiagnostics {
  private _total = 0;
  private _handled = 0;
  private _fallback = 0;
  private _handlerFailures = 0;
  private _totalDurationMs = 0;
  private _slowestDurationMs = 0;
  private readonly _byCategory = new Map<ErrorCategory, number>();
  private readonly _byCode = new Map<string, number>();

  public recordSuccess(
    category: ErrorCategory,
    code: string,
    durationMs: number,
    isFallback = false,
  ): void {
    this._total++;
    if (isFallback) {
      this._fallback++;
    } else {
      this._handled++;
    }

    this._totalDurationMs += durationMs;
    if (durationMs > this._slowestDurationMs) {
      this._slowestDurationMs = durationMs;
    }

    const catCount = this._byCategory.get(category) || 0;
    this._byCategory.set(category, catCount + 1);

    const codeCount = this._byCode.get(code) || 0;
    this._byCode.set(code, codeCount + 1);
  }

  public recordHandlerFailure(durationMs: number): void {
    this._handlerFailures++;
    this._totalDurationMs += durationMs;
    if (durationMs > this._slowestDurationMs) {
      this._slowestDurationMs = durationMs;
    }
  }

  public snapshot(): ExceptionDiagnosticsSnapshot {
    const avg = this._total > 0 ? this._totalDurationMs / this._total : 0;

    const byCategory: Record<string, number> = {};
    for (const [cat, count] of this._byCategory.entries()) {
      byCategory[cat] = count;
    }

    const byCode: Record<string, number> = {};
    for (const [code, count] of this._byCode.entries()) {
      byCode[code] = count;
    }

    const snap: ExceptionDiagnosticsSnapshot = {
      total: this._total,
      handled: this._handled,
      fallback: this._fallback,
      handlerFailures: this._handlerFailures,
      byCategory: Object.freeze(byCategory),
      byCode: Object.freeze(byCode),
      averageDurationMs: Number(avg.toFixed(4)),
      slowestDurationMs: Number(this._slowestDurationMs.toFixed(4)),
      timestamp: Date.now(),
    };

    return Object.freeze(snap);
  }
}
